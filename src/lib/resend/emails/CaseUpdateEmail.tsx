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
} from '@react-email/components';

interface CaseUpdateEmailProps {
  recipientName: string;
  subject: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

export function CaseUpdateEmail({
  recipientName,
  subject,
  body,
  ctaUrl,
  ctaLabel = 'View Update',
}: CaseUpdateEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: '#f5f0e8', fontFamily: 'Georgia, serif', margin: 0 }}>
        <Container
          style={{
            maxWidth: '560px',
            margin: '40px auto',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <Section style={{ backgroundColor: '#0d0d1a', padding: '28px 40px' }}>
            <Heading
              style={{
                color: '#c9a84c',
                fontFamily: 'Georgia, serif',
                fontSize: '22px',
                margin: 0,
              }}
            >
              LawHub
            </Heading>
          </Section>

          <Section style={{ padding: '36px 40px' }}>
            <Text
              style={{
                color: '#6b6b7a',
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
              }}
            >
              Case Update
            </Text>
            <Heading
              style={{ color: '#1a1a2e', fontSize: '20px', marginTop: 0, marginBottom: '16px' }}
            >
              {subject}
            </Heading>
            <Text style={{ color: '#4a4a6a', lineHeight: '1.7', fontSize: '15px' }}>
              Hi {recipientName},
            </Text>
            <Text style={{ color: '#4a4a6a', lineHeight: '1.7', fontSize: '15px' }}>
              {body}
            </Text>
            {ctaUrl && (
              <Button
                href={ctaUrl}
                style={{
                  backgroundColor: '#0d7377',
                  color: '#ffffff',
                  padding: '12px 28px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-block',
                  marginTop: '12px',
                }}
              >
                {ctaLabel}
              </Button>
            )}
          </Section>

          <Hr style={{ borderColor: '#e8e0d0', margin: '0 40px' }} />

          <Section style={{ padding: '20px 40px' }}>
            <Text style={{ color: '#9a9aaa', fontSize: '12px', lineHeight: '1.5' }}>
              LawHub Technologies Pvt. Ltd. · New Delhi, India
              <br />
              You received this because you have an active case on LawHub. Log in to manage
              notification preferences.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
