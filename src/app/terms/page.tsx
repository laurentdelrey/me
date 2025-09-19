import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Endless Summer",
  description: "Terms of Service for the Endless Summer iOS application",
};

export default function TermsOfService() {
  return (
    <main className="min-h-screen flex items-center justify-center relative z-10" style={{ background: '#3f2d2c', paddingTop: '120px', paddingBottom: '120px' }}>
      <div className="w-full max-w-xl px-6">
        <div className="animate-fadeInUp">
          <h1 className="text-white lowercase text-2xl mb-12 text-shadow text-center" style={{ fontWeight: 500 }}>
            terms of service
          </h1>

          <div className="text-white lowercase text-shadow text-center" style={{ fontSize: '1.125rem', lineHeight: '1.75' }}>
            <p style={{ color: '#FFB48F', marginBottom: '2rem' }}>
              effective date: september 17, 2025
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              acceptance of terms
            </h2>

            <p style={{ marginBottom: '2rem' }}>
              by downloading, installing, or using endless summer ("the app"), you agree to be bound by these terms of service.
              if you do not agree to these terms, please do not use the app.
              these terms constitute a legally binding agreement between you and endless summer.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              community guidelines & content policy
            </h2>

            <p style={{ marginBottom: '2rem', color: '#FFB48F' }}>
              <strong>zero tolerance policy:</strong> we have absolutely no tolerance for objectionable content or abusive users.
            </p>

            <p style={{ marginBottom: '2rem' }}>
              you agree not to use the app to create, upload, transmit, or store any content that is:
              illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or invasive of privacy;
              sexually explicit, pornographic, or inappropriate for all audiences;
              hateful, discriminatory, or promotes violence against any individual or group;
              infringes any patent, trademark, copyright, or other proprietary rights;
              contains viruses or any other harmful code.
            </p>

            <p style={{ marginBottom: '2rem' }}>
              violations of this policy will result in immediate account termination without warning.
              we reserve the right to remove any content that violates these guidelines and report illegal activities to law enforcement.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              use of the app
            </h2>

            <p style={{ marginBottom: '2rem' }}>
              the app is provided for personal, non-commercial use only.
              you must be at least 13 years old to use this app.
              if you are under 18, you must have parental or guardian permission.
            </p>

            <p style={{ marginBottom: '2rem' }}>
              you are responsible for maintaining the confidentiality of your account and password.
              you agree to accept responsibility for all activities that occur under your account.
              you must notify us immediately of any unauthorized use of your account.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              intellectual property
            </h2>

            <p style={{ marginBottom: '2rem' }}>
              you retain all rights to the content you create using the app.
              by using the app, you grant us a limited license to store and process your content solely for the purpose of providing the service.
              the app, including its original content, features, and functionality, remains the exclusive property of endless summer.
            </p>

            <p style={{ marginBottom: '2rem' }}>
              you may not copy, modify, distribute, sell, or lease any part of our app or its software.
              you may not reverse engineer or attempt to extract the source code of the app.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              ai-generated content
            </h2>

            <p style={{ marginBottom: '2rem' }}>
              the app uses artificial intelligence to generate and modify images.
              ai-generated content may not always be accurate or appropriate.
              you are solely responsible for reviewing and approving any ai-generated content before sharing or using it.
              we do not guarantee the accuracy, completeness, or appropriateness of ai-generated content.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              privacy
            </h2>

            <p style={{ marginBottom: '2rem' }}>
              your use of the app is also governed by our privacy policy.
              please review our privacy policy, which also governs your visit to the app,
              to understand our practices regarding the collection and use of your personal information.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              disclaimers and limitations of liability
            </h2>

            <p style={{ marginBottom: '2rem' }}>
              the app is provided on an "as is" and "as available" basis without any warranties, express or implied.
              we do not warrant that the app will be uninterrupted, secure, or error-free.
              we do not warrant the accuracy, reliability, or completeness of any content or information provided through the app.
            </p>

            <p style={{ marginBottom: '2rem' }}>
              to the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill,
              or other intangible losses resulting from your use of the app.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              indemnification
            </h2>

            <p style={{ marginBottom: '2rem' }}>
              you agree to defend, indemnify, and hold harmless endless summer and its affiliates from any claims,
              damages, obligations, losses, liabilities, costs, or debt arising from your use of the app,
              your violation of these terms, or your violation of any rights of a third party.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              termination
            </h2>

            <p style={{ marginBottom: '2rem' }}>
              we may terminate or suspend your account and access to the app immediately, without prior notice or liability,
              for any reason whatsoever, including without limitation if you breach these terms.
              upon termination, your right to use the app will immediately cease.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              governing law
            </h2>

            <p style={{ marginBottom: '2rem' }}>
              these terms shall be governed and construed in accordance with the laws of the united states,
              without regard to its conflict of law provisions.
              any disputes arising from these terms will be resolved in the courts of california.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              changes to terms
            </h2>

            <p style={{ marginBottom: '2rem' }}>
              we reserve the right to modify these terms at any time.
              if we make material changes, we will notify you through the app or by other means.
              your continued use of the app after any changes indicates your acceptance of the new terms.
            </p>

            <h2 className="text-white text-xl text-center" style={{ fontWeight: 500, marginTop: '3rem', marginBottom: '1.5rem' }}>
              contact information
            </h2>

            <p style={{ marginBottom: '1rem' }}>
              if you have any questions about these terms of service, please contact us at{' '}
              <a
                href="mailto:laurent.desserrey@gmail.com"
                style={{ color: '#FFB48F', textDecoration: 'none' }}
                className="hover:underline"
              >
                laurent.desserrey@gmail.com
              </a>
            </p>

            <p style={{ color: '#6B5654', marginTop: '4rem' }}>
              © 2025 endless summer. all rights reserved.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}