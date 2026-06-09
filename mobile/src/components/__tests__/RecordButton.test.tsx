import React from 'react';
import { create, act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { RecordButton } from '../RecordButton';

describe('RecordButton', () => {
  it('録音していない状態で描画できる', () => {
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(React.createElement(RecordButton, { isRecording: false, onPress: jest.fn() })); });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('録音中の状態で描画できる', () => {
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(React.createElement(RecordButton, { isRecording: true, onPress: jest.fn() })); });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('onPress が呼ばれる', () => {
    const onPress = jest.fn();
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(React.createElement(RecordButton, { isRecording: false, onPress })); });
    act(() => { tree!.root.findByType(TouchableOpacity).props.onPress(); });
    expect(onPress).toHaveBeenCalled();
  });
});
