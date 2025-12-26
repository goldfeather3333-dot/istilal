import { Link } from "react-router-dom";
import { FileText, ArrowLeft, Mail, Clock, MessageCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Contact = () => {
  const openWhatsApp = () => {
    const message = encodeURIComponent("Hello! I need support with Istilal.");
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-foreground mb-4">Contact & Support</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We're here to help! Reach out to our support team for assistance with your account, 
            documents, or any questions about our services.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl font-display">Email Support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <a 
                href="mailto:support@istilal.com" 
                className="text-primary text-lg font-medium hover:underline"
              >
                support@istilal.com
              </a>
              <p className="text-muted-foreground mt-3 text-sm">
                For detailed inquiries, refund requests, account issues, and general support.
              </p>
              <div className="flex items-center gap-2 mt-4 text-muted-foreground text-sm">
                <Clock className="w-4 h-4" />
                <span>Response within 24-48 hours</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/30 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-display">WhatsApp Support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={openWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Chat on WhatsApp
              </Button>
              <p className="text-muted-foreground mt-3 text-sm">
                For quick questions, payment support, and real-time assistance.
              </p>
              <div className="flex items-center gap-2 mt-4 text-muted-foreground text-sm">
                <Clock className="w-4 h-4" />
                <span>Faster response during business hours</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Common Issues */}
        <Card className="mb-12 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <HelpCircle className="w-5 h-5 text-primary" />
              How to Report an Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              When contacting support, please include the following information to help us 
              resolve your issue faster:
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                  <span><strong className="text-foreground">Your account email address</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                  <span><strong className="text-foreground">Description of the issue</strong> - What happened and what you expected</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                  <span><strong className="text-foreground">Document or transaction details</strong> - File names, order IDs, or dates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
                  <span><strong className="text-foreground">Screenshots</strong> (if applicable) - Error messages or unexpected behavior</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Response Times */}
        <Card className="mb-12 border-border">
          <CardHeader>
            <CardTitle className="font-display">Expected Response Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 font-display font-semibold text-foreground">Issue Type</th>
                    <th className="text-left py-3 font-display font-semibold text-foreground">Response Time</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-3">Payment Issues</td>
                    <td className="py-3">Within 24 hours</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Account Access</td>
                    <td className="py-3">Within 24 hours</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Technical Problems</td>
                    <td className="py-3">24-48 hours</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3">Refund Requests</td>
                    <td className="py-3">3-5 business days</td>
                  </tr>
                  <tr>
                    <td className="py-3">General Inquiries</td>
                    <td className="py-3">24-48 hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card className="bg-muted/50 border-border">
          <CardContent className="p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Contact Information</h3>
            <div className="space-y-2 text-muted-foreground text-sm">
              <p><strong className="text-foreground">Platform:</strong> Istilal</p>
              <p><strong className="text-foreground">Website:</strong> istilal.com</p>
              <p><strong className="text-foreground">Email:</strong> support@istilal.com</p>
            </div>
          </CardContent>
        </Card>
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

export default Contact;