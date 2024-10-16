export const loadMapApi = () => {
  const mapsURL = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=geometry,places&language=no&region=NO&v=quarterly`;

  // Verifica se o script da API do Google Maps já está presente
  if (window.google && window.google.maps) {
    console.log('Google API is already loaded');
    return null;  // Se já estiver presente, retorna null
  }

  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src.includes('maps.googleapis.com/maps/api/js')) {
      console.log('Google API is already presented');
      return null;  // Se o script já está na página, retorna null
    }
  }

  // Se o script não estiver presente, cria um novo script
  const googleMapScript = document.createElement('script');
  googleMapScript.src = mapsURL;
  googleMapScript.async = true;
  googleMapScript.defer = true;
  window.document.body.appendChild(googleMapScript);

  return googleMapScript;
};
