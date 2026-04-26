import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
  Preview,
} from '@react-email/components'

interface WelcomeEmailProps {
  name: string
  role: 'client' | 'lawyer'
  loginUrl: string
}

export function WelcomeEmail({ name, role, loginUrl }: WelcomeEmailProps) {
  const isLawyer = role === 'lawyer'

  return (
    <Html>
      <Head />
      <Preview>Welcome to LawHub — {isLawyer ? 'Start accepting briefs' : 'Post your first brief'}</Preview>
      <Body style={{ backgroundColor: '#f5f0e8', fontFamily: 'Georgia, serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {/* Header */}
          <Section style={{ backgroundColor: '#0d0d1a', padding: '32px 40px' }}>
            <Heading style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontSize: '24px', margin: 0 }}>
              LawHub
            </Heading>
            <Text style={{ color: '#d4c5a0', fontSize: '12px', margin: '4px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>
              India&apos;s Legal Marketplace
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '40px' }}>
            <Heading style={{ color: '#1a1a2e', fontSize: '22px', marginTop: 0 }}>
              Welcome, {name}
            </Heading>
            <Text style={{ color: '#4a4a6a', lineHeight: '1.6', fontSize: '15px' }}>
              {isLawyer
                ? 'Your advocate account has been created. Once our team verifies your Bar Council credentials, you\'ll be able to browse and bid on briefs from clients across India.'
                : 'Your LawHub account is ready. Post your first legal brief and receive competitive proposals from verified advocates within 24 hours.'}
            </Text>

            <Button
              href={loginUrl}
              style={{ backgroundColor: '#c9a84c', color: '#0d0d1a', padding: '14px 32px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginTop: '8px' }}
            >
              {isLawyer ? 'Go to Dashboard' : 'Post a Brief'}
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e8e0d0', margin: '0 40px' }} />

          <Section style={{ padding: '24px 40px' }}>
            <Text style={{ color: '#9a9aaa', fontSize: '12px', lineHeight: '1.6' }}>
              LawHub Technologies Pvt. Ltd. · New Delhi, India<br />
              You received this because you created an account at lawhub.in
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
