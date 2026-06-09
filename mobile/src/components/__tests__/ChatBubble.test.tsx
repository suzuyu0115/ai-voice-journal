import React from 'react';
import { create, act } from 'react-test-renderer';
import { ChatBubble } from '../ChatBubble';

describe('ChatBubble', () => {
  it('ユーザーメッセージを描画できる', () => {
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(React.createElement(ChatBubble, { message: { role: 'user', text: '今日は疲れた' } })); });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('AIメッセージを描画できる', () => {
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(React.createElement(ChatBubble, { message: { role: 'model', text: 'どんなことがありましたか？' } })); });
    expect(tree!.toJSON()).toBeTruthy();
  });
});
