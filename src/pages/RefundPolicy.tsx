import { Link } from "react-router-dom";
import { FileText, ArrowLeft, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const RefundPolicy = () => {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Refund & Cancellation Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        {/* Quick Summary Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-2">Eligible for Refund</h3>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Duplicate charges</li>
                    <li>• Technical failures preventing service</li>
                    <li>• Unused credits (certain conditions apply)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Not Eligible for Refund</h3>
                  <ul className="text-red-800 text-sm space-y-1">
                    <li>• Credits already used for analysis</li>
                    <li>• Dissatisfaction with analysis results</li>
                    <li>• Reports already delivered</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Digital Credits Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              Plagaiscans operates on a credit-based system for document analysis services. Please 
              understand the following regarding credits and refunds:
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
                <p className="text-amber-800 text-sm">
                  <strong>Important:</strong> Digital credits that have been used for document analysis 
                  are non-refundable. Once a document has been submitted and processed, the credit is 
                  considered fully consumed.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. When Refunds Are Available</h2>
            <p className="text-gray-600 leading-relaxed">
              We offer refunds in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-3 mt-4">
              <li>
                <strong>Duplicate Charges:</strong> If you were charged multiple times for the same 
                purchase due to a technical error, we will refund the duplicate amount.
              </li>
              <li>
                <strong>Technical Failures:</strong> If a technical issue on our end prevents you from 
                receiving your analysis report after using credits, we will refund the credits or 
                provide replacement credits.
              </li>
              <li>
                <strong>Unused Credits:</strong> Refunds for unused credits may be considered on a 
                case-by-case basis within 14 days of purchase. Processing fees may apply.
              </li>
              <li>
                <strong>Service Unavailability:</strong> If our service is unavailable for an extended 
                period affecting your ability to use purchased credits.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. When Refunds Are NOT Available</h2>
            <p className="text-gray-600 leading-relaxed">
              Refunds will not be provided in the following situations:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-3 mt-4">
              <li>
                <strong>Used Credits:</strong> Credits that have been used to analyze documents, 
                regardless of the analysis results.
              </li>
              <li>
                <strong>Reports Delivered:</strong> Once similarity or AI detection reports have been 
                generated and made available for download.
              </li>
              <li>
                <strong>Result Dissatisfaction:</strong> Disagreement with analysis results does not 
                qualify for a refund, as results reflect our analysis methodology.
              </li>
              <li>
                <strong>User Error:</strong> Uploading incorrect files, duplicate submissions, or 
                other user-initiated errors.
              </li>
              <li>
                <strong>Account Termination:</strong> Credits remaining in accounts terminated due to 
                terms of service violations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Subscription Cancellation</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have an active subscription:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-3 mt-4">
              <li>You may cancel your subscription at any time from your account settings</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>You will retain access to subscription benefits until the period ends</li>
              <li>No partial refunds are provided for unused time in the current billing period</li>
              <li>Any credits accumulated before cancellation remain in your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. How to Request a Refund</h2>
            <p className="text-gray-600 leading-relaxed">
              To request a refund, follow these steps:
            </p>
            <ol className="list-decimal pl-6 text-gray-600 space-y-3 mt-4">
              <li>
                <strong>Contact Support:</strong> Email{" "}
                <a href="mailto:support@plagaiscans.com" className="text-blue-700 hover:underline">
                  support@plagaiscans.com
                </a>{" "}
                with the subject line "Refund Request"
              </li>
              <li>
                <strong>Provide Details:</strong> Include your account email, transaction ID or 
                payment reference, date of purchase, and reason for the refund request
              </li>
              <li>
                <strong>Wait for Review:</strong> Our team will review your request within 3-5 
                business days
              </li>
              <li>
                <strong>Receive Response:</strong> We will email you with our decision and any 
                next steps
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Refund Processing</h2>
            <p className="text-gray-600 leading-relaxed">
              If your refund is approved:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-3 mt-4">
              <li>Refunds will be processed to the original payment method</li>
              <li>Processing time is typically 5-10 business days, depending on your payment provider</li>
              <li>You will receive email confirmation when the refund is initiated</li>
              <li>Any credits associated with the refunded purchase will be removed from your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Disputes</h2>
            <p className="text-gray-600 leading-relaxed">
              If you believe a refund was incorrectly denied, you may:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-3 mt-4">
              <li>Reply to our decision email with additional information</li>
              <li>Request escalation to a senior support representative</li>
              <li>Contact your payment provider directly for payment disputes</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              We encourage customers to contact us before initiating chargebacks, as we are 
              committed to resolving issues fairly.
            </p>
          </section>

          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-600">
              For refund requests or questions about this policy, contact:{" "}
              <a href="mailto:support@plagaiscans.com" className="text-blue-700 hover:underline">
                support@plagaiscans.com
              </a>
            </p>
            <p className="text-gray-600 mt-2">
              Goldfeather Prem Ltd, United Kingdom
            </p>
            <p className="text-gray-500 text-sm mt-4">
              Response time: Within 1-2 business days
            </p>
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

export default RefundPolicy;
