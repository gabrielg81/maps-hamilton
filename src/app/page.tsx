/* eslint-disable prefer-const */
"use client";
import { loadMapApi } from "@/utils/googleMapScript";
import {
  DirectionsRenderer,
  GoogleMap,
  Marker,
  Polygon,
} from "@react-google-maps/api";
import { useCallback, useEffect, useState } from "react";

const mapContainerStyle = {
  height: "400px",
  width: "800px",
};

const center = {
  lat: -10.9311395,
  lng: -37.0979195,
};

interface MarkersProps {
  coords: google.maps.LatLngLiteral;
  label: string;
}

export default function Home() {
  const [markers, setMarkers] = useState<MarkersProps[]>([]);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [routeDescription, setRouteDescription] = useState("");
  const [showDirections, setShowDirections] = useState(true);
  const [showPolygon, setShowPolygon] = useState(false);
  const [polygonPath, setPolygonPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [bestRoute, setBestRoute] = useState<MarkersProps[]>([]);

  useEffect(() => {
    const googleMapScript = loadMapApi();

    if (googleMapScript) {
      googleMapScript.addEventListener("load", function () {
        if (window.google && google.maps && google.maps.geometry) {
          setScriptLoaded(true);
        } else {
          console.error("Google Maps geometry library not available.");
        }
      });

      googleMapScript.addEventListener("error", function () {
        console.error("Failed to load Google Maps API.");
      });
    } else {
      if (window.google && google.maps && google.maps.geometry) {
        setScriptLoaded(true);
      }
    }
  }, []);

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newMarker = {
        coords: {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        },
        label: (markers.length + 1).toString(),
      };
      setMarkers((prev) => [...prev, newMarker]);
    }
  };

  // Função Gulosa já existente
  const calculateRoute = useCallback(() => {
    if (markers.length < 2) return;

    const directionsService = new google.maps.DirectionsService();
    const initialPoint = markers[0].coords;
    let remainingMarkers = markers.slice(1);
    let currentPoint = initialPoint;
    let routeWaypoints: google.maps.DirectionsWaypoint[] = [];
    let orderedMarkers: MarkersProps[] = [markers[0]];

    while (remainingMarkers.length > 0) {
      let closestPointIndex = 0;
      let closestDistance = calculateDistance(currentPoint, remainingMarkers[0].coords);

      for (let i = 1; i < remainingMarkers.length; i++) {
        const distance = calculateDistance(currentPoint, remainingMarkers[i].coords);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPointIndex = i;
        }
      }

      const closestPoint = remainingMarkers[closestPointIndex].coords;
      routeWaypoints.push({
        location: new google.maps.LatLng(closestPoint.lat, closestPoint.lng),
        stopover: true,
      });

      orderedMarkers.push(remainingMarkers[closestPointIndex]);
      currentPoint = closestPoint;
      remainingMarkers.splice(closestPointIndex, 1);
    }

    directionsService.route(
      {
        origin: new google.maps.LatLng(initialPoint.lat, initialPoint.lng),
        destination: new google.maps.LatLng(initialPoint.lat, initialPoint.lng),
        waypoints: routeWaypoints,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
          const description = orderedMarkers
            .map((marker) => `Ponto ${marker.label}`)
            .join(" → ");
          setRouteDescription(description + " → Ponto " + orderedMarkers[0].label);
        } else {
          console.error(`Error fetching directions: ${status}`);
        }
      }
    );
  }, [markers]);

  // Função de Backtracking
  const calculateRouteBacktracking = useCallback(() => {
    // Se houver menos de dois marcadores, não há rota a ser calculada
    if (markers.length < 2) return;
  
    // Inicializamos a variável que armazenará a menor distância encontrada até o momento
    let bestDistance = Infinity;
  
    // Lista temporária para a rota atual que está sendo construída
    let currentRoute: MarkersProps[] = [];
  
    // Vetor que mantém controle de quais pontos já foram visitados
    let visited = Array(markers.length).fill(false);
      
  
    // Função recursiva de backtracking
    const backtrack = (currentPoint: MarkersProps, currentDistance: number) => {
      // Adiciona o ponto atual à rota corrente
      currentRoute.push(currentPoint);
  
      // Verifica se todos os pontos foram visitados
      if (currentRoute.length === markers.length) {
        // Calcula a distância de retorno ao ponto inicial
        const returnDistance = calculateDistance(currentPoint.coords, markers[0].coords);
        const totalDistance = currentDistance + returnDistance;
  
        // Se essa rota for melhor (menor distância) que a anterior
        if (totalDistance < bestDistance) {
          // Atualiza a melhor distância e armazena a rota atual como a melhor rota temporária
          bestDistance = totalDistance;
          setBestRoute([...currentRoute]) // Cria uma cópia da rota atual
        }
      } else {
        // Loop através de todos os pontos (para tentar todas as combinações)
        for (let i = 0; i < markers.length; i++) {
          // Se o ponto ainda não foi visitado
          if (!visited[i]) {
            // Marca o ponto como visitado
            visited[i] = true;
  
            // Próximo ponto e a distância para o próximo ponto
            const nextPoint = markers[i];
            const nextDistance = calculateDistance(currentPoint.coords, nextPoint.coords);
  
            // Chama recursivamente a função para continuar a rota a partir do próximo ponto
            backtrack(nextPoint, currentDistance + nextDistance);
  
            // Depois da recursão, desfaz a marcação de visitado (backtracking)
            visited[i] = false;
          }
        }
      }
  
      // Remove o ponto atual da rota antes de voltar à chamada anterior
      currentRoute.pop();
    };
  
    // Inicia o processo de backtracking a partir do primeiro ponto
    visited[0] = true; // Marca o primeiro ponto como visitado
    backtrack(markers[0], 0); // Chama a função backtracking com o ponto inicial e distância 0
  
  
    // Atualiza a rota no mapa com a melhor rota encontrada
    if (bestRoute.length > 0) {
      const directionsService = new google.maps.DirectionsService();
      const waypoints = bestRoute.slice(1).map((marker) => ({
        location: new google.maps.LatLng(marker.coords.lat, marker.coords.lng),
        stopover: true,
      }));
  
      directionsService.route(
        {
          origin: new google.maps.LatLng(bestRoute[0].coords.lat, bestRoute[0].coords.lng),
          destination: new google.maps.LatLng(bestRoute[0].coords.lat, bestRoute[0].coords.lng),
          waypoints: waypoints,
          travelMode: google.maps.TravelMode.WALKING,
        },
        (result, status) => {
          if (status === "OK") {
            setDirections(result);
            const description = bestRoute
              .map((marker) => `Ponto ${marker.label}`)
              .join(" → ");
            setRouteDescription(description + " → Ponto " + bestRoute[0].label);
          } else {
            console.error(`Error fetching directions: ${status}`);
          }
        }
      );
    }
  }, [markers, bestRoute]);
  


  const calculateDistance = (pointA: google.maps.LatLngLiteral, pointB: google.maps.LatLngLiteral) => {
    const latLngA = new google.maps.LatLng(pointA.lat, pointA.lng);
    const latLngB = new google.maps.LatLng(pointB.lat, pointB.lng);
    return google.maps.geometry.spherical.computeDistanceBetween(latLngA, latLngB);
  };

  const clearMarkers = () => {
    setMarkers([]);
    setDirections(null);
    setRouteDescription("");
    setPolygonPath([]);
    setBestRoute([]);
  };

  const toggleDirections = () => {
    setShowDirections(!showDirections);
  };

  const togglePolygon = () => {
    setShowPolygon(!showPolygon);
  };

  const calculatePolygon = useCallback(() => {
    if (markers.length < 2) return;

    const initialPoint = markers[0].coords;
    let remainingMarkers = markers.slice(1);
    let currentPoint = initialPoint;
    let orderedMarkers: MarkersProps[] = [markers[0]];

    while (remainingMarkers.length > 0) {
      let closestPointIndex = 0;
      let closestDistance = calculateDistance(currentPoint, remainingMarkers[0].coords);

      for (let i = 1; i < remainingMarkers.length; i++) {
        const distance = calculateDistance(currentPoint, remainingMarkers[i].coords);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPointIndex = i;
        }
      }

      orderedMarkers.push(remainingMarkers[closestPointIndex]);
      currentPoint = remainingMarkers[closestPointIndex].coords;
      remainingMarkers.splice(closestPointIndex, 1);
    }

    const path = orderedMarkers.map((marker) => marker.coords);
    setPolygonPath(path);
    setShowPolygon(true);
  }, [markers]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && scriptLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={15}
            onClick={handleMapClick}
          >
            {markers.map((marker, index) => (
              <Marker key={index} position={marker.coords} label={marker.label} />
            ))} 

            {showDirections && directions && (
              <DirectionsRenderer
                options={{ suppressMarkers: true }}
                directions={directions}
              />
            )}

            {showPolygon && polygonPath.length > 0 && (
              <Polygon
                path={polygonPath}
                options={{
                  fillColor: "#000",
                  fillOpacity: 0.4,
                  strokeColor: "#000",
                  strokeOpacity: 1,
                  strokeWeight: 2,
                }}
              />
            )}
          </GoogleMap>
        )}

        <div className="flex gap-4">
          <button onClick={calculateRoute} className="p-2 bg-blue-500 text-white rounded">
            Traçar Rota Gulosa
          </button>
          <button onClick={calculateRouteBacktracking} className="p-2 bg-orange-500 text-white rounded">
            Traçar Rota Backtracking
          </button>
          <button onClick={clearMarkers} className="p-2 bg-red-500 text-white rounded">
            Limpar Marcadores
          </button>
          <button onClick={toggleDirections} className="p-2 bg-green-500 text-white rounded">
            {showDirections ? "Ocultar Rota" : "Exibir Rota"}
          </button>
          <button onClick={calculatePolygon} className="p-2 bg-purple-500 text-white rounded">
            Traçar Polígono
          </button>
          <button onClick={togglePolygon} className="p-2 bg-yellow-500 text-white rounded">
            {showPolygon ? "Ocultar Polígono" : "Exibir Polígono"}
          </button>
        </div>

        <textarea
          className="mt-4 p-2 border rounded"
          rows={4}
          cols={50}
          value={routeDescription}
          readOnly
          placeholder="A rota seguirá por aqui..."
          style={{ color: "#000" }}
        />
      </main>
    </div>
  );
}
