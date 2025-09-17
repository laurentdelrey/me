"use client";

import { motion } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";

export default function PrivacyPolicy() {
  return (
    <>
      <SiteHeader animated={false} visible={true} />

      <main className="min-h-screen relative z-10 overflow-y-auto" style={{ background: '#3f2d2c' }}>
        <div className="max-w-2xl mx-auto px-6 py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-white lowercase text-3xl mb-8 text-shadow" style={{ fontWeight: 500 }}>
              privacy policy
            </h1>

            <div className="text-white lowercase space-y-6 text-shadow" style={{ fontSize: '1.125rem', lineHeight: '1.75' }}>
              <p style={{ color: '#FFB48F' }}>
                last updated: september 17, 2025
              </p>

              <section className="space-y-4">
                <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  endless summer
                </h2>
                <p>
                  endless summer ("we", "our", or "the app") is committed to protecting your privacy.
                  this privacy policy explains how we collect, use, and safeguard your information when you use our ios application.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  information we collect
                </h2>
                <ul className="space-y-2 list-disc list-inside" style={{ color: '#d4d4d4' }}>
                  <li>photos you capture or generate within the app</li>
                  <li>location information when you add location tags to images</li>
                  <li>email address (only if you sign in with apple)</li>
                  <li>anonymous usage analytics to improve the app</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  how we use your information
                </h2>
                <ul className="space-y-2 list-disc list-inside" style={{ color: '#d4d4d4' }}>
                  <li>to provide and maintain our service</li>
                  <li>to save and sync your generated images</li>
                  <li>to enable location-based features</li>
                  <li>to improve user experience through analytics</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  data storage
                </h2>
                <p style={{ color: '#d4d4d4' }}>
                  your data is securely stored using firebase services.
                  images and associated data are only accessible by you when signed into your account.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  third-party services
                </h2>
                <p style={{ color: '#d4d4d4' }}>
                  we use the following third-party services:
                </p>
                <ul className="space-y-2 list-disc list-inside" style={{ color: '#d4d4d4' }}>
                  <li>firebase (authentication, storage, analytics)</li>
                  <li>replicate api (image generation)</li>
                  <li>apple sign in (authentication)</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  your rights
                </h2>
                <p style={{ color: '#d4d4d4' }}>
                  you have the right to:
                </p>
                <ul className="space-y-2 list-disc list-inside" style={{ color: '#d4d4d4' }}>
                  <li>access your personal data</li>
                  <li>delete your account and all associated data</li>
                  <li>opt out of analytics collection</li>
                  <li>request a copy of your data</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  data retention
                </h2>
                <p style={{ color: '#d4d4d4' }}>
                  we retain your data as long as your account is active.
                  you can delete your account and all associated data at any time through the app settings.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  children's privacy
                </h2>
                <p style={{ color: '#d4d4d4' }}>
                  our service is not directed to children under 13.
                  we do not knowingly collect personal information from children under 13.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  changes to this policy
                </h2>
                <p style={{ color: '#d4d4d4' }}>
                  we may update this privacy policy from time to time.
                  we will notify you of any changes by updating the "last updated" date.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-white" style={{ fontSize: '1.25rem', fontWeight: 500 }}>
                  contact us
                </h2>
                <p style={{ color: '#d4d4d4' }}>
                  if you have questions about this privacy policy, please contact us at:
                </p>
                <p>
                  <a
                    href="mailto:laurent.desserrey@gmail.com?subject=Endless%20Summer%20Privacy%20Policy"
                    style={{ color: '#FFB48F', textDecoration: 'none' }}
                    className="hover:underline"
                  >
                    laurent.desserrey@gmail.com
                  </a>
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
}