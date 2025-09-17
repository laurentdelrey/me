import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Endless Summer",
  description: "Privacy Policy for the Endless Summer iOS application",
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen flex items-center justify-center relative z-10 py-16" style={{ background: '#3f2d2c' }}>
      <div className="w-full max-w-2xl px-6">
        <div className="animate-fadeInUp">
          <h1 className="text-white lowercase text-2xl mb-8 text-shadow" style={{ fontWeight: 500 }}>
            privacy policy
          </h1>

          <div className="text-white lowercase space-y-6 text-shadow" style={{ fontSize: '1.125rem', lineHeight: '1.75' }}>
            <p style={{ color: '#FFB48F' }}>
              effective date: september 17, 2025
            </p>

            <p>
              endless summer ("we," "us," "our," or "the app") operates the endless summer mobile application.
              this page informs you of our policies regarding the collection, use, and disclosure of personal data
              when you use our service and the choices you have associated with that data.
            </p>

            <h2 className="text-white text-xl mt-8 mb-4" style={{ fontWeight: 500 }}>
              information collection and use
            </h2>

            <p>
              we collect several different types of information for various purposes to provide and improve our service to you.
              the types of personal data collected include photos and images you capture or generate within the app,
              location information when you choose to add location tags to your images,
              email address if you sign in with apple, and device information for analytics purposes.
            </p>

            <p>
              we use the collected data to provide and maintain our service, to save and synchronize your generated images across devices,
              to enable location-based features and memories, to improve and optimize our app experience,
              to provide customer support, and to detect, prevent and address technical issues.
            </p>

            <h2 className="text-white text-xl mt-8 mb-4" style={{ fontWeight: 500 }}>
              data storage and security
            </h2>

            <p>
              your personal data is stored using firebase services provided by google.
              we implement appropriate technical and organizational security measures designed to protect the security
              of any personal information we process. however, please be aware that no method of transmission
              over the internet or method of electronic storage is 100% secure and we cannot guarantee absolute security.
            </p>

            <p>
              images and associated metadata are encrypted in transit and at rest.
              your content is only accessible when you are signed into your account.
              we do not sell, trade, or otherwise transfer your personal information to third parties
              except as described in this privacy policy.
            </p>

            <h2 className="text-white text-xl mt-8 mb-4" style={{ fontWeight: 500 }}>
              third-party services
            </h2>

            <p>
              our app uses third-party services that may collect information used to identify you.
              these services include firebase for authentication, cloud storage, and analytics,
              replicate api for ai-powered image generation services,
              and sign in with apple for secure authentication.
            </p>

            <p>
              each of these third-party service providers has their own privacy policy addressing how they use such information.
              we encourage you to review their privacy policies to understand how they handle your data.
            </p>

            <h2 className="text-white text-xl mt-8 mb-4" style={{ fontWeight: 500 }}>
              data retention
            </h2>

            <p>
              we will retain your personal data only for as long as is necessary for the purposes set out in this privacy policy.
              we will retain and use your personal data to the extent necessary to comply with our legal obligations,
              resolve disputes, and enforce our legal agreements and policies.
            </p>

            <p>
              when you delete your account, we will delete or anonymize your personal information within 30 days,
              except where we are required to retain this data to comply with legal obligations.
              you may delete individual images at any time through the app interface.
            </p>

            <h2 className="text-white text-xl mt-8 mb-4" style={{ fontWeight: 500 }}>
              your data protection rights
            </h2>

            <p>
              you have certain data protection rights. you have the right to access, update or delete the information we have on you.
              you can do this directly within the app settings or by contacting us.
              you have the right to request that we correct any information you believe is inaccurate.
              you also have the right to request that we complete information you believe is incomplete.
            </p>

            <p>
              you have the right to request that we erase your personal data, under certain conditions.
              you have the right to object to our processing of your personal data, under certain conditions.
              you have the right to request that we transfer the data that we have collected to another organization,
              or directly to you, under certain conditions.
            </p>

            <h2 className="text-white text-xl mt-8 mb-4" style={{ fontWeight: 500 }}>
              children's privacy
            </h2>

            <p>
              our service does not address anyone under the age of 13. we do not knowingly collect
              personally identifiable information from anyone under the age of 13. if you are a parent
              or guardian and you are aware that your child has provided us with personal data,
              please contact us. if we become aware that we have collected personal data from children
              without verification of parental consent, we take steps to remove that information from our servers.
            </p>

            <h2 className="text-white text-xl mt-8 mb-4" style={{ fontWeight: 500 }}>
              analytics
            </h2>

            <p>
              we use firebase analytics to collect app usage data to improve our service.
              this data is collected anonymously and includes app crashes and performance data,
              feature usage statistics, and general app interaction patterns.
              no personally identifiable information is shared with analytics unless you explicitly consent.
              you can opt out of analytics collection in the app settings.
            </p>

            <h2 className="text-white text-xl mt-8 mb-4" style={{ fontWeight: 500 }}>
              changes to this privacy policy
            </h2>

            <p>
              we may update our privacy policy from time to time. we will notify you of any changes
              by posting the new privacy policy on this page and updating the "effective date" at the top of this privacy policy.
              you are advised to review this privacy policy periodically for any changes.
              changes to this privacy policy are effective when they are posted on this page.
            </p>

            <h2 className="text-white text-xl mt-8 mb-4" style={{ fontWeight: 500 }}>
              contact us
            </h2>

            <p>
              if you have any questions about this privacy policy, please contact us by email at{' '}
              <a
                href="mailto:laurent.desserrey@gmail.com"
                style={{ color: '#FFB48F', textDecoration: 'none' }}
                className="hover:underline"
              >
                laurent.desserrey@gmail.com
              </a>
            </p>

            <p style={{ color: '#6B5654', marginTop: '3rem' }}>
              © 2025 endless summer. all rights reserved.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}