import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Endless Summer",
  description: "Privacy Policy for the Endless Summer iOS application",
};

export default function PrivacyPolicy() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-center py-7">
        <a href="/" className="lowercase text-base" style={{ color: '#6B5654', textDecoration: 'none' }}>
          laurent del rey
        </a>
      </header>

      <main className="min-h-screen flex items-center justify-center relative z-10" style={{ background: '#3f2d2c' }}>
        <div className="w-full max-w-md px-6">
          <div className="animate-fadeInUp">
            <h1 className="text-white lowercase text-base mb-2 text-shadow" style={{ fontWeight: 500 }}>
              privacy policy
            </h1>

            <div className="text-white lowercase space-y-6 text-shadow" style={{ fontSize: '1.125rem', lineHeight: '1.75' }}>
              <p>
                endless summer is committed to protecting your privacy.
                we collect photos you capture, location tags,
                and email addresses when you sign in with apple.
                we use anonymous analytics to improve the app.
              </p>

              <p>
                your data is stored securely through firebase.
                images are only accessible when signed into your account.
                we use replicate api for image generation
                and apple sign in for authentication.
              </p>

              <p>
                you can access your data, delete your account,
                opt out of analytics, or request a copy anytime.
                we retain data while your account is active.
                our service is not for children under 13.
              </p>

              <p style={{ color: '#6B5654' }}>
                last updated: september 17, 2025
              </p>

              <p style={{ color: '#6B5654' }}>
                questions? <a
                  href="mailto:laurent.desserrey@gmail.com"
                  style={{ color: '#FFB48F', textDecoration: 'none' }}
                  className="hover:underline"
                >
                  laurent.desserrey@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Footer - mimicking homepage style */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-center" style={{ height: '100px' }}>
          <a href="/" className="lowercase text-sm" style={{ color: '#6B5654', textDecoration: 'none', padding: '4px 12px' }}>
            scroll to start ↓
          </a>
        </div>
      </main>
    </>
  );
}