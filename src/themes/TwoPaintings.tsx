import { GiMonaLisa } from 'react-icons/gi';
import type { IconType } from 'react-icons';

export const TwoPaintings: IconType = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={props.size || '1em'} height={props.size || '1em'} style={props.style} className={props.className}>
    <svg x="16" y="176" width="232" height="232">
      <GiMonaLisa color={props.color} size="100%" />
    </svg>
    <svg x="264" y="64" width="232" height="232">
      <GiMonaLisa color={props.color} size="100%" />
    </svg>
  </svg>
);
