import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FileCheck, Bot, Clock, Shield, ArrowRight, Zap, Users, Award, ChevronRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppSupportButton } from "@/components/WhatsAppSupportButton";
import { useState } from "react";

const Landing = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const stats = [
    { value: "50K+", label: "Documents Checked" },
    { value: "99.9%", label: "Accuracy Rate" },
    { value: "24/7", label: "Support Available" },
  ];

  const features = [
    {
      icon: FileCheck,
      title: "Similarity Detection",
      description: "Advanced algorithms compare your document against billions of sources for comprehensive similarity analysis.",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: Bot,
      title: "AI Content Detection",
      description: "Identify AI-generated content with our cutting-edge detection system trained on the latest models.",
      color: "from-teal-500 to-cyan-500",
    },
    {
      icon: Clock,
      title: "Lightning Fast",
      description: "Get detailed reports in minutes, not hours. Our optimized pipeline ensures rapid turnaround times.",
      color: "from-cyan-500 to-blue-500",
    },
    {
      icon: Shield,
      title: "100% Private",
      description: "Your documents are encrypted, never stored permanently, and never shared with third parties.",
      color: "from-blue-500 to-indigo-500",
    },
  ];

  const testimonials = [
    {
      quote: "Istilal has become an essential tool for our research department. The accuracy is unmatched.",
      author: "Dr. Sarah Chen",
      role: "Research Director",
    },
    {
      quote: "Fast, reliable, and the reports are incredibly detailed. Exactly what we needed.",
      author: "Prof. Ahmed Hassan",
      role: "University Faculty",
    },
    {
      quote: "The AI detection feature saved us countless hours of manual review. Highly recommended!",
      author: "Maria Rodriguez",
      role: "Academic Coordinator",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Floating Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl px-6 py-3 shadow-lg">
            <div className="flex justify-between items-center">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-display font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Istilal
                </span>
              </Link>
              
              {/* Desktop Links */}
              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-muted-foreground hover:text-foreground font-medium transition-colors text-sm">
                  Features
                </a>
                <a href="#how-it-works" className="text-muted-foreground hover:text-foreground font-medium transition-colors text-sm">
                  How It Works
                </a>
                <a href="#testimonials" className="text-muted-foreground hover:text-foreground font-medium transition-colors text-sm">
                  Reviews
                </a>
              </div>

              <div className="hidden md:flex items-center gap-3">
                {user ? (
                  <Link to="/dashboard">
                    <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl px-6 shadow-lg shadow-emerald-500/25">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button variant="ghost" className="text-foreground hover:bg-muted rounded-xl">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth">
                      <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl px-6 shadow-lg shadow-emerald-500/25">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button 
                className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden pt-4 pb-2 border-t border-border/50 mt-4 space-y-3">
                <a href="#features" className="block py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
                <a href="#how-it-works" className="block py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
                <a href="#testimonials" className="block py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
                <div className="pt-2 flex flex-col gap-2">
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl">Sign In</Button>
                  </Link>
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl">Get Started</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Split Layout */}
      <section className="pt-32 pb-20 px-4 relative">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-teal-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-emerald-500/5 to-transparent rounded-full" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Zap className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Trusted by 10,000+ researchers</span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight">
                <span className="text-foreground">Verify Document</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                  Originality
                </span>
                <br />
                <span className="text-foreground">Instantly</span>
              </h1>

              {/* Description */}
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Advanced similarity detection and AI content analysis. Get comprehensive reports in minutes with industry-leading accuracy.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl px-8 h-14 text-lg shadow-xl shadow-emerald-500/25 group">
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button size="lg" variant="outline" className="rounded-xl px-8 h-14 text-lg border-2">
                    See How It Works
                  </Button>
                </a>
              </div>

              {/* Stats */}
              <div className="flex gap-8 pt-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-display font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Visual */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Main Card */}
                <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  
                  {/* Document Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                          <FileCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Research_Paper.docx</div>
                          <div className="text-xs text-muted-foreground">Uploaded just now</div>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium">
                        Processing...
                      </div>
                    </div>

                    {/* Results Preview */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-xl border border-emerald-500/20">
                        <div className="text-sm text-muted-foreground mb-1">Similarity</div>
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">12%</div>
                        <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Low similarity</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-teal-500/10 to-transparent rounded-xl border border-teal-500/20">
                        <div className="text-sm text-muted-foreground mb-1">AI Content</div>
                        <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">3%</div>
                        <div className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-1">Mostly human</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl">
                        Download Report
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 bg-card border border-border rounded-2xl p-4 shadow-xl animate-float">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium">100% Secure</span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-2xl p-4 shadow-xl animate-float" style={{ animationDelay: "0.5s" }}>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-teal-500" />
                    <span className="text-sm font-medium">Fast Results</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <Award className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Everything You Need for
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                Document Integrity
              </span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools you need to ensure academic integrity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-card rounded-2xl p-8 border border-border hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-4 flex items-center text-emerald-600 dark:text-emerald-400 font-medium group-hover:gap-2 transition-all">
                  <span className="text-sm">Learn more</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              Three Simple Steps
            </h2>
            <p className="text-muted-foreground text-lg">
              Get started in minutes with our streamlined process
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />

            {[
              { step: "01", title: "Upload", desc: "Drop your document in any format - we support PDF, DOCX, and more" },
              { step: "02", title: "Analyze", desc: "Our AI engine scans against billions of sources in seconds" },
              { step: "03", title: "Download", desc: "Get detailed reports with source links and improvement suggestions" },
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/25 relative z-10">
                  <span className="text-xl font-display font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Trusted Globally</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              What Our Users Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-card rounded-2xl p-8 border border-border hover:border-emerald-500/30 transition-colors">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-12 text-center relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of academics and researchers who trust Istilal for document integrity verification.
              </p>
              <Link to="/auth">
                <Button size="lg" className="bg-white text-emerald-600 hover:bg-white/90 rounded-xl px-10 h-14 text-lg font-semibold shadow-xl group">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-display font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Istilal
                </span>
              </div>
              <p className="text-muted-foreground max-w-sm leading-relaxed">
                Advanced document integrity platform for similarity detection and AI content analysis. 
                Trusted by researchers and institutions worldwide.
              </p>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-display font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link to="/terms-and-conditions" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/refund-policy" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-display font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link to="/about-us" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Contact & Support</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Istilal. All rights reserved.
            </p>
            <p className="text-muted-foreground text-sm">
              <a href="mailto:support@istilal.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">support@istilal.com</a>
            </p>
          </div>
        </div>
      </footer>

      <WhatsAppSupportButton />
    </div>
  );
};

export default Landing;