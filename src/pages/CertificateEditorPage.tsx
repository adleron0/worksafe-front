import React from 'react';
import CertificateEditor from '@/components/general-components/CertificateEditor';

const CertificateEditorPage: React.FC = () => {
  const handleSaveCertificate = (certificateData: any) => {
    console.log('Certificate saved:', certificateData);
    // In a real application, you would save this data to a database or file
  };

  return (
    <div className="h-screen w-full flex flex-col">
      <header className="bg-primary text-white p-4">
        <h1 className="text-xl font-bold">Certificate Editor</h1>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <CertificateEditor onSave={handleSaveCertificate} />
      </main>
    </div>
  );
};

export default CertificateEditorPage;
