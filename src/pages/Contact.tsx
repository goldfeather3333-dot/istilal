import { Link } from "react-router-dom";
import { FileText, ArrowLeft, Mail, Clock, MessageCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Contact = () => {
  const openWhatsApp = () => {
    const message = encodeURIComponent("Hello! I need support with Plagaiscans.");
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact & Support</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            We're here to help! Reach out to our support team for assistance with your account, 
            documents, or any questions about our services.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Email Support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <a 
                href="mailto:support@plagaiscans.com" 
                className="text-blue-700 text-lg font-medium hover:underline"
              >
                support@plagaiscans.com
              </a>
              <p className="text-gray-600 mt-3 text-sm">
                For detailed inquiries, refund requests, account issues, and general support.
              </p>
              <div className="flex items-center gap-2 mt-4 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>Response within 24-48 hours</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">WhatsApp Support</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={openWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Chat on WhatsApp
              </Button>
              <p className="text-gray-600 mt-3 text-sm">
                For quick questions, payment support, and real-time assistance.
              </p>
              <div className="flex items-center gap-2 mt-4 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>Faster response during business hours</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Common Issues */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-700" />
              How to Report an Issue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              When contacting support, please include the following information to help us 
              resolve your issue faster:
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                  <span><strong>Your account email address</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                  <span><strong>Description of the issue</strong> - What happened and what you expected</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                  <span><strong>Document or transaction details</strong> - File names, order IDs, or dates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
                  <span><strong>Screenshots</strong> (if applicable) - Error messages or unexpected behavior</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Response Times */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Expected Response Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-semibold text-gray-900">Issue Type</th>
                    <th className="text-left py-3 font-semibold text-gray-900">Response Time</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100">
                    <td className="py-3">Payment Issues</td>
                    <td className="py-3">Within 24 hours</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3">Account Access</td>
                    <td className="py-3">Within 24 hours</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3">Technical Problems</td>
                    <td className="py-3">24-48 hours</td>
                  </tr>
                  <tr className="border-b border-gray-100">
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
        <Card className="bg-gray-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Company Information</h3>
            <div className="space-y-2 text-gray-600 text-sm">
              <p><strong>Brand:</strong> Plagaiscans</p>
              <p><strong>Operated by:</strong> Goldfeather Prem Ltd</p>
              <p><strong>Country:</strong> United Kingdom</p>
              <p><strong>Email:</strong> support@plagaiscans.com</p>
            </div>
          </CardContent>
        </Card>
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

export default Contact;
