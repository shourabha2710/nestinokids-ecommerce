import React from 'react';
import MobilePageHeader from '../components/MobilePageHeader';
import { motion } from 'framer-motion';

const AboutUsPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MobilePageHeader title="About NestinoKids" className="mb-4 -mx-4 -mt-2" />
          <h1 className="hidden md:block text-3xl font-bold text-text mb-6">About NestinoKids</h1>
          <div className="prose prose-gray max-w-none space-y-4">
            <p className="text-gray-600 leading-relaxed">
              NestinoKids is a premium kids' apparel brand dedicated to providing soft, comfortable, and stylish clothing for children. Based in New Delhi, we understand that your child's comfort is your top priority.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Our journey began with a simple mission: to create clothing that parents can trust and children love to wear. Every piece in our collection is carefully selected for its quality, comfort, and durability.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We believe that childhood should be filled with joy, exploration, and comfort. Our clothing is designed to keep up with your little ones — whether they're taking their first steps or running through the park.
            </p>
            <h2 className="text-xl font-bold text-text mt-8 mb-4">Our Values</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Quality:</strong> We source only the finest fabrics for your children.</li>
              <li><strong>Comfort:</strong> Every design prioritizes ease of movement and softness.</li>
              <li><strong>Trust:</strong> Thousands of parents trust NestinoKids for their little ones.</li>
              <li><strong>Affordability:</strong> Premium quality at prices that make sense.</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutUsPage;
