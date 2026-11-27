import * as cdk from 'aws-cdk-lib'
import { ArcLearnStack } from '../lib/stack'

const app = new cdk.App()

new ArcLearnStack(app, 'ArcLearnStack', {
  env: {
    account: '877353262122',
    region: 'eu-west-1',
  },
})
