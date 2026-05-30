import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface VerificationEmailProps {
  recipientName: string;
  verificationUrl: string;
  expiryHours?: number;
}

export default function VerificationEmail({
  recipientName,
  verificationUrl,
  expiryHours = 24,
}: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your LawHub email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={logo}>LawHub</Heading>
          <Heading style={h1}>Verify your email</Heading>
          <Text style={text}>
            Hello {recipientName},
          </Text>
          <Text style={text}>
            Thank you for creating a LawHub account. Please verify your email address
            by clicking the button below. This link expires in {expiryHours} hours.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={verificationUrl}>
              Verify Email Address
            </Button>
          </Section>
          <Text style={text}>
            If you did not create a LawHub account, you can safely ignore this email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            LawHub · India's Legal Marketplace
          </Text>
          <Text style={footer}>
            If the button above doesn't work, copy and paste this URL into your browser:
          </Text>
          <Text style={{ ...footer, wordBreak: 'break-all' }}>{verificationUrl}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f5f0e8',
  fontFamily: "'Georgia', serif",
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(14,12,10,0.1)',
  borderRadius: '12px',
  padding: '40px',
};

const logo = {
  fontFamily: "'Georgia', serif",
  fontSize: '28px',
  fontWeight: '700',
  color: '#0e0c0a',
  marginBottom: '8px',
};

const h1 = {
  fontFamily: "'Georgia', serif",
  fontSize: '22px',
  fontWeight: '600',
  color: '#0e0c0a',
  marginBottom: '20px',
};

const text = {
  fontSize: '15px',
  lineHeight: '1.7',
  color: 'rgba(14,12,10,0.75)',
  marginBottom: '16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const button = {
  backgroundColor: '#0d7377',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
};

const hr = {
  borderColor: 'rgba(14,12,10,0.1)',
  margin: '28px 0 16px',
};

const footer = {
  fontSize: '12px',
  color: 'rgba(14,12,10,0.4)',
  marginBottom: '6px',
};
