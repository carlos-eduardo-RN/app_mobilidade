import 'react-leaflet';
import type { LatLngExpression, PointExpression } from 'leaflet';

declare module 'react-leaflet' {
  interface MapContainerProps {
    center?: LatLngExpression;
    zoom?: number;
  }

  interface TileLayerProps {
    attribution?: string;
  }

  interface CircleMarkerProps {
    radius?: number;
  }

  interface TooltipProps {
    direction?: string;
    offset?: PointExpression;
  }
}
