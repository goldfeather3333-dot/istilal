import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Bot, Clock, Shield, ArrowRight, Sparkles, CheckCircle } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold text-foreground">Istilal</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
                    Login
                  </Link>
                  <Link to="/auth">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6">
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
        <section className="py-20 px-4 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-card rounded-full border border-border shadow-soft mb-8">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm text-muted-foreground">Trusted by academics & researchers worldwide</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
              Plagiarism & Similarity Check
              <br />
              <span className="gradient-text">
                For Academic Integrity
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Clear similarity reports you can trust. Verify text originality, identify overlapping 
              sections, and understand similarity sources through easy-to-read reports.
            </p>

            {/* Trust Badge - Updated */}
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-card rounded-xl border border-border shadow-soft mb-8">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-foreground font-medium">Privacy-First Plagiarism Scanning</span>
            </div>

            {/* CTA Button */}
            <div>
              <Link to="/auth">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg font-medium shadow-elegant btn-elegant">
                  Start Checking
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                Comprehensive Document Analysis
              </h2>
              <p className="text-muted-foreground text-lg">
                Detailed similarity reports with source insights for academic compliance
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-6 border border-border hover:shadow-elegant hover:border-primary/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 bg-card">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground text-lg">
                Get your document checked in four simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center group">
                  <div className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-display font-bold mx-auto mb-4 shadow-soft group-hover:scale-110 transition-transform duration-300">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 bg-primary/5">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                Why Choose Istilal?
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Detailed similarity reports with source insights",
                "Identify overlapping text and improve originality",
                "Citation & reference checks for academic compliance",
                "Optional AI-content detection indicators",
                "Privacy-first plagiarism scanning",
                "Fast, clear, and easy-to-read reports"
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-card">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
              Ready to Check Your Documents?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of students, researchers, and universities who trust Istilal for accurate plagiarism and similarity checking.
            </p>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg font-medium shadow-elegant btn-elegant">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-display font-bold text-foreground">Istilal</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-sm">
                Academic integrity platform for plagiarism and similarity checking. 
                Clear reports you can trust for students, researchers, and universities.
              </p>
            </div>
            
            {/* Legal Links */}
            <div>
              <h4 className="font-display font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms-and-conditions" className="text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/refund-policy" className="text-muted-foreground hover:text-primary transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
            
            {/* Company Links */}
            <div>
              <h4 className="font-display font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about-us" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact & Support</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="pt-8 border-t border-border text-center space-y-2">
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
        </div>
      </footer>

      <WhatsAppSupportButton />
    </div>
  );
};

export default Landing;