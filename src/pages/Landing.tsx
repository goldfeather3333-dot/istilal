import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Bot, Clock, Shield, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppSupportButton } from "@/components/WhatsAppSupportButton";

const Landing = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: FileText,
      title: "Similarity Detection",
      description: "Detailed similarity reports with source insights. Identify overlapping text and improve originality.",
    },
    {
      icon: Bot,
      title: "AI Content Indicators",
      description: "Optional AI-content detection to evaluate whether text may include AI-generated writing.",
    },
    {
      icon: Clock,
      title: "Fast Processing",
      description: "Get your detailed reports back within minutes, not hours.",
    },
    {
      icon: Shield,
      title: "Privacy-First",
      description: "Your documents are encrypted and never shared with third parties.",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Create Account",
      description: "Sign up with your email, phone, and password",
    },
    {
      number: "2",
      title: "Purchase Credits",
      description: "Contact us on WhatsApp to buy credits",
    },
    {
      number: "3",
      title: "Upload Document",
      description: "Upload your file (1 credit per document)",
    },
    {
      number: "4",
      title: "Get Reports",
      description: "Download similarity and AI detection reports",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Istilal</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-6">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth" className="text-gray-600 hover:text-gray-900 font-medium">
                    Login
                  </Link>
                  <Link to="/auth">
                    <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-6">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-200 mb-8">
            <Sparkles className="w-4 h-4 text-blue-700" />
            <span className="text-sm text-gray-600">Trusted by academics & researchers worldwide</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            Plagiarism & Similarity Check
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              For Academic Integrity
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Clear similarity reports you can trust. Verify text originality, identify overlapping 
            sections, and understand similarity sources through easy-to-read reports.
          </p>

          {/* Trust Badge - Updated */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
            <Shield className="w-5 h-5 text-blue-700" />
            <span className="text-gray-700 font-medium">Privacy-First Plagiarism Scanning</span>
          </div>

          {/* CTA Button */}
          <div>
            <Link to="/auth">
              <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-8 py-6 text-lg font-medium">
                Start Checking
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Document Analysis
            </h2>
            <p className="text-gray-500 text-lg">
              Detailed similarity reports with source insights for academic compliance
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-gray-500 text-lg">
              Get your document checked in four simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-blue-700 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ready to Check Your Documents?
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            Join thousands of students, researchers, and universities who trust Istilal for accurate plagiarism and similarity checking.
          </p>
          <Link to="/auth">
            <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-8 py-6 text-lg font-medium">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-gray-900">Istilal</span>
              </div>
              <p className="text-gray-500 text-sm max-w-sm">
                Academic integrity platform for plagiarism and similarity checking. 
                Clear reports you can trust for students, researchers, and universities.
              </p>
            </div>
            
            {/* Legal Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms-and-conditions" className="text-gray-500 hover:text-blue-700">Terms & Conditions</Link></li>
                <li><Link to="/privacy-policy" className="text-gray-500 hover:text-blue-700">Privacy Policy</Link></li>
                <li><Link to="/refund-policy" className="text-gray-500 hover:text-blue-700">Refund Policy</Link></li>
              </ul>
            </div>
            
            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about-us" className="text-gray-500 hover:text-blue-700">About Us</Link></li>
                <li><Link to="/contact" className="text-gray-500 hover:text-blue-700">Contact & Support</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="pt-8 border-t border-gray-100 text-center space-y-2">
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} Istilal. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs">
              Check originality. Protect academic integrity.
            </p>
            <p className="text-gray-500 text-xs">
              Contact: <a href="mailto:support@istilal.com" className="text-blue-700 hover:underline">support@istilal.com</a>
            </p>
          </div>
        </div>
      </footer>

      <WhatsAppSupportButton />
    </div>
  );
};

export default Landing;