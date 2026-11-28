import * as cdk from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as sns from 'aws-cdk-lib/aws-sns'
import { Construct } from 'constructs'

export class ArcLearnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Image tag injected by GitHub Actions: cdk deploy --context imageTag=$GITHUB_SHA
    const imageTag = (this.node.tryGetContext('imageTag') as string | undefined) ?? 'latest'

    // ── VPC ──────────────────────────────────────────────────────────────────
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 1,
    })

    // ── ECR (imported — created by workflow on first run) ─────────────────────
    const repo = ecr.Repository.fromRepositoryName(this, 'Repo', 'archouse-learn')

    // ── RDS ──────────────────────────────────────────────────────────────────
    const db = new rds.DatabaseInstance(this, 'Db', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      databaseName: 'archouse_learn',
      multiAz: false,
      storageEncrypted: true,
      deletionProtection: false,
      backupRetention: cdk.Duration.days(7),
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    })

    // ── App secrets ───────────────────────────────────────────────────────────
    // After first deploy: populate DATABASE_URL using the DbEndpoint output and
    // the password from DbSecretArn, then restart the ECS service.
    const appSecret = new secretsmanager.Secret(this, 'AppEnv', {
      secretName: 'archouse-learn/env',
      description: 'Application env vars — populate DATABASE_URL after first deploy',
      secretStringValue: cdk.SecretValue.unsafePlainText(
        JSON.stringify({
          DATABASE_URL: 'REPLACE_ME',
          AUTH_SECRET: 'REPLACE_ME',
          RESEND_API_KEY: 'REPLACE_ME',
          GOOGLE_CLIENT_ID: 'REPLACE_ME',
          GOOGLE_CLIENT_SECRET: 'REPLACE_ME',
          ALLOWED_ORIGINS: 'https://learn.archouse.ltd',
        })
      ),
    })

    // ── ECS ───────────────────────────────────────────────────────────────────
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc })

    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
    })

    repo.grantPull(taskDef.taskRole)
    appSecret.grantRead(taskDef.taskRole)

    taskDef.addContainer('app', {
      image: ecs.ContainerImage.fromEcrRepository(
        ecr.Repository.fromRepositoryName(this, 'RepoRef', 'archouse-learn'),
        imageTag
      ),
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(appSecret, 'DATABASE_URL'),
        AUTH_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'AUTH_SECRET'),
        RESEND_API_KEY: ecs.Secret.fromSecretsManager(appSecret, 'RESEND_API_KEY'),
        GOOGLE_CLIENT_ID: ecs.Secret.fromSecretsManager(appSecret, 'GOOGLE_CLIENT_ID'),
        GOOGLE_CLIENT_SECRET: ecs.Secret.fromSecretsManager(appSecret, 'GOOGLE_CLIENT_SECRET'),
        ALLOWED_ORIGINS: ecs.Secret.fromSecretsManager(appSecret, 'ALLOWED_ORIGINS'),
      },
      environment: {
        NODE_ENV: 'production',
        AUTH_TRUST_HOST: 'true',
      },
      portMappings: [{ containerPort: 3000 }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'archouse-learn' }),
      healthCheck: {
        command: ['CMD-SHELL', 'wget -qO- http://localhost:3000/api/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    })

    // ── Certificate + DNS ────────────────────────────────────────────────────
    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: 'archouse.ltd',
    })

    const cert = new acm.Certificate(this, 'Cert', {
      domainName: 'learn.archouse.ltd',
      validation: acm.CertificateValidation.fromDns(zone),
    })

    // ── ALB Fargate service ──────────────────────────────────────────────────
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      publicLoadBalancer: true,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificate: cert,
      domainName: 'learn.archouse.ltd',
      domainZone: zone,
      redirectHTTP: true,
      healthCheckGracePeriod: cdk.Duration.seconds(120),
    })

    service.targetGroup.configureHealthCheck({
      path: '/api/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
    })

    // Allow ECS tasks to reach RDS
    db.connections.allowFrom(service.service, ec2.Port.tcp(5432))

    // ── Alarms ───────────────────────────────────────────────────────────────
    const alarmTopic = new sns.Topic(this, 'Alarms', {
      displayName: 'archouse-learn-alarms',
    })

    new cloudwatch.Alarm(this, 'Error5xx', {
      metric: service.loadBalancer.metrics.httpCodeElb(elbv2.HttpCodeElb.ELB_5XX_COUNT, {
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'ALB 5xx errors > 10 in 5 min',
    }).addAlarmAction(new cwActions.SnsAction(alarmTopic))

    new cloudwatch.Alarm(this, 'NoHealthyHosts', {
      metric: service.targetGroup.metrics.healthyHostCount({
        period: cdk.Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'No healthy ECS tasks',
    }).addAlarmAction(new cwActions.SnsAction(alarmTopic))

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ClusterName', { value: cluster.clusterName })
    new cdk.CfnOutput(this, 'ServiceName', { value: service.service.serviceName })
    new cdk.CfnOutput(this, 'DbEndpoint', { value: db.instanceEndpoint.hostname })
    new cdk.CfnOutput(this, 'DbSecretArn', { value: db.secret?.secretArn ?? 'n/a' })
    new cdk.CfnOutput(this, 'AppSecretArn', { value: appSecret.secretArn })
    new cdk.CfnOutput(this, 'AlarmTopicArn', { value: alarmTopic.topicArn })
  }
}
