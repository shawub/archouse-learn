import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { OAuthProviderButtons, type OAuthProviderButtonsProps } from '@/components/forms/oauth-provider-buttons'

const noop = async () => {}

function render(props: Partial<OAuthProviderButtonsProps>) {
  return renderToStaticMarkup(
    <OAuthProviderButtons
      showGoogle={false}
      showMicrosoft={false}
      source="login"
      googleAction={noop}
      microsoftAction={noop}
      {...props}
    />,
  )
}

test('renders nothing when no provider is configured', () => {
  assert.equal(render({}), '')
})

test('renders only the Google button when only Google is configured', () => {
  const html = render({ showGoogle: true })
  assert.match(html, /Continue with Google/)
  assert.doesNotMatch(html, /Microsoft/)
})

test('renders only the Microsoft button when only Microsoft is configured', () => {
  const html = render({ showMicrosoft: true })
  assert.match(html, /Continue with Microsoft/)
  assert.doesNotMatch(html, /Google/)
})

test('buttons are native, keyboard-focusable submit buttons with a focus ring', () => {
  const html = render({ showGoogle: true, showMicrosoft: true })
  const buttons = html.match(/<button[^>]*>/g) ?? []
  assert.equal(buttons.length, 2)
  for (const b of buttons) {
    assert.match(b, /type="submit"/)
    assert.match(b, /focus-visible:ring-2/)
    assert.doesNotMatch(b, /tabindex="-1"/)
  }
})

test('register buttons carry the selected role', () => {
  const html = render({ showGoogle: true, source: 'register', role: 'TEACHER' })
  assert.match(html, /name="source" value="register"/)
  assert.match(html, /name="role" value="TEACHER"/)
})

test('login buttons carry no role', () => {
  const html = render({ showGoogle: true, source: 'login', role: 'TEACHER' })
  assert.match(html, /name="source" value="login"/)
  assert.doesNotMatch(html, /name="role"/)
})
