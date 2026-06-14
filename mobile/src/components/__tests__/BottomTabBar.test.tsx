import React from 'react';
import { create, act } from 'react-test-renderer';
import { BottomTabBar } from '../BottomTabBar';

const mockReplace = jest.fn();
let mockPathname = '/';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 34, top: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/';
});

describe('BottomTabBar', () => {
  it('4つのタブラベルを表示する', () => {
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<BottomTabBar />); });
    const texts = renderer!.root.findAllByType('Text' as unknown as React.ElementType);
    const labels = texts.map((t) => t.props.children as string);
    expect(labels).toContain('ホーム');
    expect(labels).toContain('会話');
    expect(labels).toContain('カレンダー');
    expect(labels).toContain('設定');
  });

  it('/ パスのとき home タブがアクティブカラーになる', () => {
    mockPathname = '/';
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<BottomTabBar />); });
    const texts = renderer!.root.findAllByType('Text' as unknown as React.ElementType);
    const homeLabel = texts.find((t) => t.props.children === 'ホーム');
    expect(homeLabel).toBeDefined();
    const styles = ([] as object[]).concat(homeLabel!.props.style ?? []).flat();
    expect(styles).toContainEqual(expect.objectContaining({ color: '#4A90E2' }));
  });

  it('/conversation パスのとき会話タブがアクティブになる', () => {
    mockPathname = '/conversation';
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<BottomTabBar />); });
    const texts = renderer!.root.findAllByType('Text' as unknown as React.ElementType);
    const label = texts.find((t) => t.props.children === '会話');
    expect(label).toBeDefined();
    const styles = ([] as object[]).concat(label!.props.style ?? []).flat();
    expect(styles).toContainEqual(expect.objectContaining({ color: '#4A90E2' }));
  });

  it('タブをタップすると router.replace が呼ばれる', () => {
    mockPathname = '/';
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<BottomTabBar />); });
    // '会話' テキストを含む onPress 付きノードを探す
    const pressables = renderer!.root.findAll((n) => typeof n.props.onPress === 'function');
    const conversationTab = pressables.find((p) =>
      p.findAll((n) => n.props.children === '会話').length > 0
    );
    expect(conversationTab).toBeDefined();
    act(() => { conversationTab!.props.onPress(); });
    expect(mockReplace).toHaveBeenCalledWith('/conversation');
  });

  it('サマリー画面ではどのタブもアクティブにならない', () => {
    mockPathname = '/summary/new';
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<BottomTabBar />); });
    const texts = renderer!.root.findAllByType('Text' as unknown as React.ElementType);
    const activeLabels = texts.filter((t) => {
      const styles = ([] as object[]).concat(t.props.style ?? []).flat();
      return styles.some((s) => (s as { color?: string }).color === '#4A90E2');
    });
    expect(activeLabels).toHaveLength(0);
  });
});
