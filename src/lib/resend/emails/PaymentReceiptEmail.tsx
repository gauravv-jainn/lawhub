import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Preview,
  Row,
  Column,
} from '@react-email/components'

interface PaymentReceiptEmailProps {
  recipientName: string
  amount: number
  platformFee: number
  netAmount: number
  caseTitle: string
  milestoneName: string
  paymentId: string
  date: string
  isLawyer?: boolean
}

export function PaymentReceiptEmail({
  recipientName,
  amount,
  platformFee,
  netAmount,
  caseTitle,
  milestoneName,
  paymentId,
  date,
  isLawyer = false,
}: PaymentReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Payment {isLawyer ? 'received' : 'confirmed'} — ₹{amount.toLocaleString('en-IN')} for {caseTitle}</Preview>
      <Body style={{ backgroundColor: '#f5f0e8', fontFamily: 'Georgia, serif', margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <Section style={{ backgroundColor: '#0d0d1a', padding: '32px 40px' }}>
            <Heading style={{ color: '#c9a84c', fontFamily: 'Georgia, serif', fontSize: '24px', margin: 0 }}>
              LawHub
            </Heading>
            <Text style={{ color: '#d4c5a0', fontSize: '12px', margin: '4px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Payment Receipt
            </Text>
          </Section>

          <Section style={{ padding: '40px' }}>
            <Heading style={{ color: '#1a1a2e', fontSize: '20px', marginTop: 0 }}>
              {isLawyer ? 'Payment Released to You' : 'Payment Confirmed'}
            </Heading>
            <Text style={{ color: '#4a4a6a', lineHeight: '1.6', fontSize: '15px' }}>
              Hi {recipientName}, {isLawyer ? 'a milestone payment has been released to your account.' : 'your payment has been processed and held in escrow.'}
            </Text>

            {/* Receipt table */}
            <Section style={{ backgroundColor: '#f5f0e8', borderRadius: '8px', padding: '20px 24px', margin: '16px 0' }}>
              <Row style={{ marginBottom: '8px' }}>
                <Column><Text style={{ color: '#4a4a6a', fontSize: '13px', margin: 0 }}>Case</Text></Column>
                <Column><Text style={{ color: '#1a1a2e', fontSize: '13px', fontWeight: 'bold', margin: 0, textAlign: 'right' }}>{caseTitle}</Text></Column>
              </Row>
              <Row style={{ marginBottom: '8px' }}>
                <Column><Text style={{ color: '#4a4a6a', fontSize: '13px', margin: 0 }}>Milestone</Text></Column>
                <Column><Text style={{ color: '#1a1a2e', fontSize: '13px', margin: 0, textAlign: 'right' }}>{milestoneName}</Text></Column>
              </Row>
              <Row style={{ marginBottom: '8px' }}>
                <Column><Text style={{ color: '#4a4a6a', fontSize: '13px', margin: 0 }}>Amount</Text></Column>
                <Column><Text style={{ color: '#1a1a2e', fontSize: '13px', margin: 0, textAlign: 'right' }}>₹{amount.toLocaleString('en-IN')}</Text></Column>
              </Row>
              {isLawyer && (
                <>
                  <Row style={{ marginBottom: '8px' }}>
                    <Column><Text style={{ color: '#4a4a6a', fontSize: '13px', margin: 0 }}>Platform Fee (10%)</Text></Column>
                    <Column><Text style={{ color: '#9a9aaa', fontSize: '13px', margin: 0, textAlign: 'right' }}>−₹{platformFee.toLocaleString('en-IN')}</Text></Column>
                  </Row>
                  <Hr style={{ borderColor: '#d4c5a0', margin: '12px 0' }} />
                  <Row>
                    <Column><Text style={{ color: '#1a1a2e', fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Net Payout</Text></Column>
                    <Column><Text style={{ color: '#c9a84c', fontSize: '16px', fontWeight: 'bold', margin: 0, textAlign: 'right' }}>₹{netAmount.toLocaleString('en-IN')}</Text></Column>
                  </Row>
                </>
              )}
              <Hr style={{ borderColor: '#d4c5a0', margin: '12px 0' }} />
              <Row>
                <Column><Text style={{ color: '#9a9aaa', fontSize: '11px', margin: 0 }}>Payment ID: {paymentId}</Text></Column>
                <Column><Text style={{ color: '#9a9aaa', fontSize: '11px', margin: 0, textAlign: 'right' }}>{date}</Text></Column>
              </Row>
            </Section>
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
