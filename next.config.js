const csp="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://*.google-analytics.com https://*.backblazeb2.com; media-src 'self' blob: https://*.backblazeb2.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'";
module.exports={async headers(){return[{source:'/:path*',headers:[
{key:'Content-Security-Policy',value:csp},{key:'X-Frame-Options',value:'DENY'},
{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'same-origin'},
{key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains'},
{key:'X-Robots-Tag',value:'noindex, nofollow'}]}]}};
