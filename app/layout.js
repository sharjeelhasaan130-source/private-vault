import Script from 'next/script';
import './globals.css';
export const metadata = { title: 'Private Video & Audio Cloud', description: 'Securely store and access your private videos and audio files from anywhere.', robots: { index: true, follow: false } };
export default function L({ children }) {
  const g = process.env.NEXT_PUBLIC_GA_ID;
  return (<html lang="en"><body>{children}
    {g && <><Script src={`https://www.googletagmanager.com/gtag/js?id=${g}`} strategy="afterInteractive" />
    <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${g}',{anonymize_ip:true});`}</Script></>}
  </body></html>);
}
