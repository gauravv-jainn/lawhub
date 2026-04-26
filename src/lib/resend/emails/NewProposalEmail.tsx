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

interface NewProposalEmailProps {
  clientName: string
  lawyerName: string
  briefTitle: string
  proposedFee: number
  briefUrl: string
}

export function NewProposalEmail({
  clientName,
  lawyerName,
  briefTitle,
  proposedFee,
  briefUrl,
}: NewProposalEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New proposal from Adv. {lawyerName} for &quot;{briefTitle}&quot;</Preview>
      <Body style={{ backgroundColor: '#f5f0e8', fontFamily: 'Georgia, serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Section style={{ backgroundColor: '#0d0d1a', padding: '32px 40px' }}>
            <Heading style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontSize: '24px', margin: 0 }}>
              LawHub
            </Heading>
          </Section>

          <Section style={{ padding: '40px' }}>
            <Heading style={{ color: '#1a1a2e', fontSize: '20px', marginTop: 0 }}>
              You have a new proposal
            </Heading>
            <Text style={{ color: '#4a4a6a', lineHeight: '1.6', fontSize: '15px' }}>
              Hi {clientName}, Adv. <strong>{lawyerName}</strong> has submitted a proposal for your brief:
            </Text>

            <Section style={{ backgroundColor: '#f5f0e8', borderRadius: '8px', padding: '20px 24px', margin: '16px 0' }}>
              <Text style={{ color: '#1a1a2e', fontWeight: 'bold', fontSize: '15px', margin: '0 0 8px' }}>
                {briefTitle}
              </Text>
              <Text style={{ color: '#4a4a6a', fontSize: '14px', margin: 0 }}>
                Proposed fee: <strong>₹{proposedFee.toLocaleString('en-IN')}</strong>
              </Text>
            </Section>

            <Button
              href={briefUrl}
              style={{ backgroundColor: '#c9a84c', color: '#0d0d1a', padding: '14px 32px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none', display: 'inline-block', marginTop: '8px' }}
            >
              Review Proposal
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e8e0d0', margin: '0 40px' }} />

          <Section style={{ padding: '24px 40px' }}>
            <Text style={{ color: '#9a9aaa', fontSize: '12px' }}>
              LawHub Technologies Pvt. Ltd. · New Delhi, India
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
