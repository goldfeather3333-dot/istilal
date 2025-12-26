import { Link } from "react-router-dom";
import { FileText, Shield, Users, Globe, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const AboutUs = () => {
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
        <h1 className="text-4xl font-display font-bold text-foreground mb-8">About Istilal</h1>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Who We Are</h2>
            <p className="text-muted-foreground leading-relaxed">
              Istilal is an academic integrity platform focused on plagiarism and similarity checking. 
              We help students, researchers, and faculty verify text originality, identify overlapping 
              sections, and understand similarity sources through clear, easy-to-read reports.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Istilal also supports optional AI-content detection indicators to help users evaluate 
              whether text may include AI-generated writing, aligned with academic integrity needs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Our Services</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground">Similarity Detection</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Detailed similarity reports with source insights. Identify overlapping text 
                    and improve originality with citation and reference checks for academic compliance.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground">AI Content Indicators</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Optional AI-content detection indicators to help evaluate whether text may 
                    include AI-generated writing from various AI tools.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Our Commitment</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">Privacy-First Scanning</h3>
                  <p className="text-muted-foreground text-sm">
                    Your documents are encrypted during transfer and processing. We implement strict 
                    data protection measures to ensure your work remains confidential.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">Customer Support</h3>
                  <p className="text-muted-foreground text-sm">
                    Our dedicated support team is available to assist you with any questions or concerns 
                    regarding our services.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-display font-semibold text-foreground">Global Service</h3>
                  <p className="text-muted-foreground text-sm">
                    We provide our document analysis services to students, researchers, and universities 
                    worldwide, with support for multiple document formats and languages.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-muted/50 rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Contact Information</h2>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">Platform:</strong> Istilal</p>
              <p><strong className="text-foreground">Website:</strong> istilal.com</p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <strong className="text-foreground">Contact:</strong>{" "}
                <a href="mailto:support@istilal.com" className="text-primary hover:underline">
                  support@istilal.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-foreground mb-4">Important Links</h2>
            <div className="flex flex-wrap gap-4">
              <Link to="/terms-and-conditions" className="text-primary hover:underline">
                Terms & Conditions
              </Link>
              <Link to="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              <Link to="/refund-policy" className="text-primary hover:underline">
                Refund Policy
              </Link>
              <Link to="/contact" className="text-primary hover:underline">
                Contact Us
              </Link>
            </div>
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

export default AboutUs;