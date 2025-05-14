import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FeatureProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="text-center p-2 md:p-6 rounded-md hover:-translate-y-1 ease-in-out duration-300">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-2 bg-gradient-to-r from-green-400 to-primary-light text-white">
        <Icon size={32} />
      </div>
      <h3 className="text-gray-700 leading-tight text-base md:text-lg font-semibold">{title}</h3>
      <p className="text-gray-600 text-xs md:text-sm">{description}</p>
    </div>
  );
};

export default Feature;
