// Inter Regular for all text, set once (Calm Surfaces 3). Every Text that
// isn't inside another Text, and every TextInput, starts from it; a style that
// names a family (a weight from FONT, an icon font, a reading font) still wins.
// Text inside a Text keeps its parent's family, as React Native's text does.
//
// React Native 0.81 defines Text as a plain function component, so there is no
// render function to wrap, and under Expo's Babel preset a module's `default`
// export is a getter that can't be reassigned. What can change is the
// `react-native` entry point: its exports are getters on a plain object
// (`get Text()`), read each time a component renders. So this redefines those
// two, and has to run before anything renders: index.js imports it first.
// (WeatherWell's way; TuneWell's, which assigns to Text's module, crashes at
// launch under Expo.)
import React, { useContext } from 'react';

const ReactNative = require('react-native');
// The context React Native's own Text sets for its children
const TextAncestorContext = require('react-native/Libraries/Text/TextAncestorContext').default;

const REGULAR = { fontFamily: 'Inter-Regular' };

const OriginalText = ReactNative.Text;

function InterText(props) {
  const insideText = useContext(TextAncestorContext);
  return React.createElement(OriginalText, insideText ? props : { ...props, style: [REGULAR, props.style] });
}
InterText.displayName = 'Text';

const OriginalTextInput = ReactNative.TextInput;

function InterTextInput(props) {
  return React.createElement(OriginalTextInput, { ...props, style: [REGULAR, props.style] });
}
// TextInput.State and the like stay reachable
Object.assign(InterTextInput, OriginalTextInput);
InterTextInput.displayName = 'TextInput';

Object.defineProperty(ReactNative, 'Text', { configurable: true, enumerable: true, get: () => InterText });
Object.defineProperty(ReactNative, 'TextInput', { configurable: true, enumerable: true, get: () => InterTextInput });
