export type Store = {
    lang: 'xml' | 'json' | 'javascript';
    flow: Flow;
    buffers: {
      xml: string;
      json: string;
      javascript: string;
    };
    type: 'html' | 'png' | 'jpg';
    aspectRatio: [number, number] | null;
  };
  
  export type Actions = {
    updateFlow: (xml: string) => void;
  
    setDimensions: (
      dimensions: Partial<{ width: number; height: number }>
    ) => void;
    setAspectRatio: (aspectRatio: [number, number] | null) => void;
    setFlow: (flow: Flow) => void;
    setLang: (lang: 'xml' | 'json' | 'javascript') => void;
    setType: (type: 'html' | 'png' | 'jpg') => void;
    setText: (
      text: Partial<{
        title: string;
        subtitle: string;
        position: TextPosition;
        font: Font;
      }>
    ) => void;
  };
  
  export type TextPosition =
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right';
  
  export type Font =
    | 'Arial'
    | 'Verdana'
    | 'Tahoma'
    | '"Trebuchet MS"'
    | '"Times New Roman"'
    | 'Georgia'
    | 'Garamond'
    | '"Courier New"'
    | '"Brush Script MT"';
  
  export type Flow = {
    width: number;
    height: number;
  
    title?: string;
    subtitle?: string;
    position?: TextPosition;
    font?: Font;
  
    nodes: {
      id: string;
      width: number;
      height: number;
      position: {
        x: number;
        y: number;
      };
    }[];
  
    edges: {
      id: string;
      source: string;
      target: string;
    }[];
  };
  