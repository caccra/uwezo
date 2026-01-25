import { Shield, Camera, UserCheck, Building, AlertTriangle, Lock } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

const services = [
  {
    icon: Shield,
    title: 'Armed Security Guards',
    description: 'Highly trained armed personnel for maximum protection of your premises and assets.'
  },
  {
    icon: UserCheck,
    title: 'Personal Protection',
    description: 'Discreet and professional bodyguard services for executives and VIPs.'
  },
  {
    icon: Camera,
    title: 'CCTV Surveillance',
    description: 'State-of-the-art surveillance systems with 24/7 monitoring and rapid response.'
  },
  {
    icon: Building,
    title: 'Corporate Security',
    description: 'Comprehensive security solutions for businesses, offices, and corporate facilities.'
  },
  {
    icon: AlertTriangle,
    title: 'Risk Assessment',
    description: 'Professional security audits and risk analysis to identify vulnerabilities.'
  },
  {
    icon: Lock,
    title: 'Access Control',
    description: 'Advanced access control systems to manage and monitor entry to your facilities.'
  }
];

export function Services() {
  return (
    <section id="services" className="bg-gray-950 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl text-white mb-4">Our Services</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Comprehensive security solutions designed to meet your specific needs
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className="bg-gray-900 border border-gray-800 rounded-xl p-8 hover:border-blue-600 transition-colors group"
              >
                <div className="bg-blue-600/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-600/20 transition-colors">
                  <Icon className="w-7 h-7 text-blue-500" />
                </div>
                <h3 className="text-xl text-white mb-3">{service.title}</h3>
                <p className="text-gray-400 leading-relaxed">{service.description}</p>
              </div>
            );
          })}
        </div>

        {/* Feature Section with Image */}
        <div className="grid md:grid-cols-2 gap-12 items-center mt-24">
          <div className="relative h-[400px] rounded-xl overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1672073311074-f60c4a5e7b92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdXJ2ZWlsbGFuY2UlMjBjYW1lcmFzJTIwc2VjdXJpdHl8ZW58MXx8fHwxNzY5MzU0NDA1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Security Surveillance"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-3xl text-white mb-6">Advanced Technology</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              We leverage cutting-edge security technology including AI-powered surveillance, 
              facial recognition, and integrated alarm systems to provide comprehensive protection.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
                <span className="text-gray-300">Real-time monitoring and alerts</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
                <span className="text-gray-300">Cloud-based storage and access</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
                <span className="text-gray-300">Mobile app integration</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
