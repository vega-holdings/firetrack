declare module 'react-usa-map' {
  interface USAMapProps {
    onClick?: (event: { target: { dataset: { name: string } } }) => void;
    width?: number;
    height?: number;
    defaultFill?: string;
    customize?: { [stateKey: string]: { fill: string } };
  }

  export default function USAMap(props: USAMapProps): JSX.Element;
}
