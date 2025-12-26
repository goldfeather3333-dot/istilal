import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold text-foreground">Istilal</span>
            </Link>
            <Link to="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-display font-bold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">1. Data Controller</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Istilal</strong> is the data controller responsible for your personal data. 
              We are committed to protecting your privacy and handling your data in accordance 
              with applicable data protection laws.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Contact: <a href="mailto:support@istilal.com" className="text-primary hover:underline">support@istilal.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-display font-semibold text-foreground mb-3 mt-6">Account Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Email address (required for account creation)</li>
              <li>Full name (optional)</li>
              <li>Phone number (optional)</li>
              <li>Account preferences and settings</li>
            </ul>

            <h3 className="text-xl font-display font-semibold text-foreground mb-3 mt-6">Uploaded Documents</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Documents submitted for analysis</li>
              <li>File metadata (name, size, format)</li>
              <li>Generated similarity and AI detection reports</li>
            </ul>

            <h3 className="text-xl font-display font-semibold text-foreground mb-3 mt-6">Technical Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Usage data and interaction logs</li>
            </ul>

            <h3 className="text-xl font-display font-semibold text-foreground mb-3 mt-6">Payment Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Payment method metadata (we do not store full card details)</li>
              <li>Transaction history</li>
              <li>Billing information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">3. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              We process your personal data for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong className="text-foreground">Service Delivery:</strong> To process your documents and generate reports</li>
              <li><strong className="text-foreground">Account Management:</strong> To create and maintain your account</li>
              <li><strong className="text-foreground">Payment Processing:</strong> To process transactions and manage credits</li>
              <li><strong className="text-foreground">Communication:</strong> To send service updates, notifications, and support responses</li>
              <li><strong className="text-foreground">Security:</strong> To detect and prevent fraud and abuse</li>
              <li><strong className="text-foreground">Improvement:</strong> To analyze usage patterns and improve our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">4. Document Handling and Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              We take your document privacy seriously:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Documents are encrypted during transfer using TLS/SSL</li>
              <li>Files are stored in secure, encrypted storage</li>
              <li>Documents are retained only as long as necessary for service delivery</li>
              <li>You may delete your documents at any time after processing is complete</li>
              <li>Submitted documents are not shared with third parties</li>
              <li>Documents are not added to any public repository</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">5. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use trusted third-party services to operate our platform:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong className="text-foreground">Payment Processors:</strong> Secure payment gateways for transaction processing</li>
              <li><strong className="text-foreground">Cloud Hosting:</strong> Secure cloud infrastructure for data storage</li>
              <li><strong className="text-foreground">Email Services:</strong> For transactional and notification emails</li>
              <li><strong className="text-foreground">Analytics:</strong> For understanding service usage (anonymized data)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              These providers are contractually obligated to protect your data and only process it 
              according to our instructions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate security measures including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure backup procedures</li>
              <li>Staff training on data protection</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Under data protection law, you have the following rights:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong className="text-foreground">Right to Access:</strong> Request a copy of your personal data</li>
              <li><strong className="text-foreground">Right to Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong className="text-foreground">Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong className="text-foreground">Right to Restrict Processing:</strong> Limit how we use your data</li>
              <li><strong className="text-foreground">Right to Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong className="text-foreground">Right to Object:</strong> Object to certain processing activities</li>
              <li><strong className="text-foreground">Right to Withdraw Consent:</strong> Withdraw previously given consent</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, contact us at{" "}
              <a href="mailto:support@istilal.com" className="text-primary hover:underline">
                support@istilal.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data according to the following guidelines:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Account data: Retained until account deletion</li>
              <li>Uploaded documents: Users may delete at any time after processing</li>
              <li>Transaction records: Retained as required by law (typically 7 years)</li>
              <li>Usage logs: Retained for up to 12 months</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">9. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and service functionality. These are 
              necessary for the platform to operate correctly. We do not use tracking cookies 
              for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">10. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data may be processed in countries outside your jurisdiction. When this occurs, we 
              ensure appropriate safeguards are in place to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant 
              changes via email or through the platform. The "Last updated" date indicates when the 
              policy was last revised.
            </p>
          </section>

          <section className="bg-muted/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related inquiries, please contact:{" "}
              <a href="mailto:support@istilal.com" className="text-primary hover:underline">
                support@istilal.com
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border bg-card mt-16">
        <div className="max-w-6xl mx-auto text-center space-y-2">
          <p className="text-foreground text-sm">
            © {new Date().getFullYear()} Istilal. All rights reserved.
          </p>
          <p className="text-muted-foreground text-xs">
            Check originality. Protect academic integrity.
          </p>
          <p className="text-muted-foreground text-xs">
            Contact: <a href="mailto:support@istilal.com" className="text-primary hover:underline">support@istilal.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;