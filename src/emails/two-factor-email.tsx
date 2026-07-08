import * as React from "react";

import {
  EmailCode,
  EmailHeading,
  EmailLayout,
  EmailText,
} from "./components/email-layout";

export default function TwoFactorEmail({
  name = "there",
  code = "000000",
}: {
  name?: string;
  code?: string;
}) {
  return (
    <EmailLayout preview={`${code} is your ConfluentX verification code`}>
      <EmailHeading>Your verification code</EmailHeading>
      <EmailText>Hi {name},</EmailText>
      <EmailText muted>
        Use this code to finish signing in to ConfluentX. It expires in 10 minutes.
      </EmailText>
      <EmailCode code={code} />
      <EmailText muted>
        If you didn&apos;t try to sign in, we recommend changing your password
        immediately.
      </EmailText>
    </EmailLayout>
  );
}
