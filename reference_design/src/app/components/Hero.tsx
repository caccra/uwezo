import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { Shield, ArrowRight } from 'lucide-react';

export function Hero() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1764173038831-3ef384e6321e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWN1cml0eSUyMGd1YXJkJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc2OTI3NDczOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Security Professional"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-12 h-12 text-blue-500" />
            <span className="text-blue-500 text-lg">Professional Security Solutions</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl text-white mb-6">
            Your Safety is Our <span className="text-blue-500">Priority</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Uwezo Security provides comprehensive security solutions tailored to protect 
            what matters most. From personal protection to corporate security, we deliver 
            excellence in safety and peace of mind.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => scrollToSection('contact')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg flex items-center justify-center gap-2 transition-colors"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollToSection('services')}
              className="border border-gray-600 hover:border-gray-400 text-white px-8 py-4 rounded-lg text-lg transition-colors"
            >
              Our Services
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-gray-700">
            <div>
              <div className="text-4xl text-blue-500 mb-2">500+</div>
              <div className="text-gray-400">Clients Served</div>
            </div>
            <div>
              <div className="text-4xl text-blue-500 mb-2">24/7</div>
              <div className="text-gray-400">Support</div>
            </div>
            <div>
              <div className="text-4xl text-blue-500 mb-2">15+</div>
              <div className="text-gray-400">Years Experience</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
