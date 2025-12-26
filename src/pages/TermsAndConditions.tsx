import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsAndConditions = () => {
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
        <h1 className="text-4xl font-display font-bold text-foreground mb-4">Terms and Conditions</h1>
        <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Istilal. These Terms and Conditions govern your use of our website and services. 
              By accessing or using our platform, you agree to be bound by these terms. If you do not agree 
              with any part of these terms, please do not use our services.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">These services are provided by Istilal, an academic integrity platform focused on plagiarism and similarity checking.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">2. Description of Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Istilal provides academic integrity services, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Plagiarism and similarity detection comparing documents against academic and web sources</li>
              <li>AI content detection indicators to evaluate AI-generated text</li>
              <li>Detailed analysis reports with source insights in PDF format</li>
              <li>Citation and reference checks for academic compliance</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Our services are designed to assist with academic integrity verification and should be used 
              as a supplementary tool, not as the sole determinant of document authenticity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">3. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              By using our services, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Use the service only for lawful purposes</li>
              <li>Only upload documents you have the right to submit for analysis</li>
              <li>Not attempt to circumvent any security measures</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">4. Prohibited Usage</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are expressly prohibited from:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Uploading illegal, harmful, threatening, defamatory, or obscene content</li>
              <li>Submitting copyrighted material without proper authorization</li>
              <li>Using the service to facilitate academic dishonesty or fraud</li>
              <li>Attempting to reverse-engineer or exploit our systems</li>
              <li>Sharing account access with unauthorized parties</li>
              <li>Using automated systems to access the service without permission</li>
              <li>Reselling or redistributing our services without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">5. Credits and Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services operate on a credit-based system:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Credits must be purchased before document submission</li>
              <li>One credit is consumed per document analyzed</li>
              <li>Purchased credits do not expire</li>
              <li>Prices are displayed in USD and are subject to change</li>
              <li>All payments are processed through secure third-party payment processors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">6. Account Suspension and Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account if:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>You violate any terms of this agreement</li>
              <li>We suspect fraudulent or illegal activity</li>
              <li>You engage in abusive behavior toward staff or other users</li>
              <li>Payment disputes or chargebacks occur without valid reason</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Upon termination, your access to the platform will be revoked. Any unused credits may be 
              forfeited at our discretion, depending on the circumstances of termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Istilal provides services "as is" without warranties of any kind</li>
              <li>We do not guarantee that our analysis will detect all instances of similarity or AI content</li>
              <li>We are not liable for any decisions made based on our reports</li>
              <li>Our maximum liability shall not exceed the amount paid for the specific service</li>
              <li>We are not responsible for any consequential, incidental, or indirect damages</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Our analysis provides educational insights and should be interpreted with professional 
              judgment. Results should not be considered absolute proof of plagiarism or AI authorship.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, trademarks, and intellectual property on this platform are owned by 
              Istilal unless otherwise stated. You retain ownership of documents you 
              submit but grant us a limited license to process them for service delivery.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. Continued use of the service after changes 
              constitutes acceptance of the new terms. We recommend reviewing these terms periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">10. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms are governed by applicable laws. Any disputes shall be 
              resolved through appropriate legal channels.
            </p>
          </section>

          <section className="bg-muted/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these Terms and Conditions, please contact us at:{" "}
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

export default TermsAndConditions;