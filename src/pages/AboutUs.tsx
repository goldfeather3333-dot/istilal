import { Link } from "react-router-dom";
import { FileText, Shield, Users, Globe, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">PlagaiScans</span>
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">About Plagaiscans</h1>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Who We Are</h2>
            <p className="text-gray-600 leading-relaxed">
              Plagaiscans is a professional document analysis platform providing AI-assisted similarity detection 
              and plagiarism analysis services. We serve students, educators, researchers, and businesses worldwide 
              who require reliable document authenticity verification.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              <strong>Plagaiscans is a brand operated by Goldfeather Prem Ltd</strong>, a company registered 
              in the <strong>United Kingdom</strong>. We are committed to providing transparent, reliable, 
              and secure document analysis services to our global customer base.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Services</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-700" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Similarity Detection</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Advanced analysis comparing documents against billions of academic papers, websites, 
                    and publications from multiple sources.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-700" />
                    </div>
                    <h3 className="font-semibold text-gray-900">AI Content Detection</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Identify AI-generated content from various AI writing tools including ChatGPT, 
                    Claude, and other language models.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-700 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Privacy & Security</h3>
                  <p className="text-gray-600 text-sm">
                    Your documents are encrypted during transfer and processing. We implement strict 
                    data protection measures in compliance with GDPR standards.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-700 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Customer Support</h3>
                  <p className="text-gray-600 text-sm">
                    Our dedicated support team is available to assist you with any questions or concerns 
                    regarding our services.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-blue-700 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Global Service</h3>
                  <p className="text-gray-600 text-sm">
                    We provide our document analysis services to customers worldwide, with support for 
                    multiple document formats and languages.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Company Information</h2>
            <div className="space-y-3 text-gray-600">
              <p><strong>Brand Name:</strong> Plagaiscans</p>
              <p><strong>Operated by:</strong> Goldfeather Prem Ltd</p>
              <p><strong>Country:</strong> United Kingdom</p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <strong>Contact:</strong>{" "}
                <a href="mailto:support@plagaiscans.com" className="text-blue-700 hover:underline">
                  support@plagaiscans.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Important Links</h2>
            <div className="flex flex-wrap gap-4">
              <Link to="/terms-and-conditions" className="text-blue-700 hover:underline">
                Terms & Conditions
              </Link>
              <Link to="/privacy-policy" className="text-blue-700 hover:underline">
                Privacy Policy
              </Link>
              <Link to="/refund-policy" className="text-blue-700 hover:underline">
                Refund Policy
              </Link>
              <Link to="/contact" className="text-blue-700 hover:underline">
                Contact Us
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-100 bg-white mt-16">
        <div className="max-w-6xl mx-auto text-center space-y-2">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Plagaiscans. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs">
            Plagaiscans is operated by Goldfeather Prem Ltd (United Kingdom)
          </p>
          <p className="text-gray-500 text-xs">
            Contact: <a href="mailto:support@plagaiscans.com" className="text-blue-700 hover:underline">support@plagaiscans.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
