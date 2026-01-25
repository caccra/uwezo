import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { Award, Users, Clock, TrendingUp, Shield } from 'lucide-react';

export function About() {
  return (
    <section id="about" className="bg-black py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
          <div>
            <h2 className="text-4xl md:text-5xl text-white mb-6">About Uwezo Security</h2>
            <p className="text-gray-400 mb-6 leading-relaxed text-lg">
              Founded with a mission to provide world-class security services, Uwezo Security 
              has grown to become a trusted name in the industry. Our team of highly trained 
              professionals brings years of experience in law enforcement, military, and private 
              security.
            </p>
            <p className="text-gray-400 mb-8 leading-relaxed text-lg">
              We understand that every client has unique security needs. That's why we offer 
              customized solutions that adapt to your specific requirements, ensuring maximum 
              protection and peace of mind.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Award className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-white mb-1">Certified</div>
                  <div className="text-sm text-gray-400">Licensed & Insured</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-white mb-1">Trained Team</div>
                  <div className="text-sm text-gray-400">Elite Professionals</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-white mb-1">24/7 Service</div>
                  <div className="text-sm text-gray-400">Always Available</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-white mb-1">Track Record</div>
                  <div className="text-sm text-gray-400">Proven Success</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-[500px] rounded-xl overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1652148555073-4b1d2ecd664c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWN1cml0eSUyMHRlYW0lMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzY5MzU0NDA1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Security Team"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        </div>

        {/* Values */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 md:p-12">
          <h3 className="text-3xl text-white mb-8 text-center">Our Core Values</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-500" />
              </div>
              <h4 className="text-xl text-white mb-3">Integrity</h4>
              <p className="text-gray-400">
                We uphold the highest ethical standards in all our operations and client interactions.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <h4 className="text-xl text-white mb-3">Excellence</h4>
              <p className="text-gray-400">
                We strive for excellence in training, service delivery, and client satisfaction.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
              <h4 className="text-xl text-white mb-3">Reliability</h4>
              <p className="text-gray-400">
                Our clients trust us to be there when needed, delivering consistent security 24/7.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
