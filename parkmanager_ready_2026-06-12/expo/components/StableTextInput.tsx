import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import {
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import type { TextInputProps } from 'react-native';

type RNTextInputRef = React.ElementRef<typeof RNTextInput>;

let focusedInputKey: string | null = null;
let clearFocusTimer: ReturnType<typeof setTimeout> | null = null;
let fallbackId = 0;

function isTextEntryElement(element: unknown): boolean {
  const el = element as { tagName?: string; getAttribute?: (name: string) => string | null } | null | undefined;
  if (!el?.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.getAttribute?.('contenteditable') === 'true';
}

function getActiveElement(): unknown {
  return (globalThis as unknown as { document?: { activeElement?: unknown } }).document?.activeElement;
}

const StableTextInput = forwardRef<RNTextInputRef, TextInputProps>((props, forwardedRef) => {
  const localRef = useRef<RNTextInputRef | null>(null);
  const focusKeyRef = useRef(
    props.nativeID ?? props.placeholder ?? `stable-input-${++fallbackId}`
  );

  const setRefs = useCallback((node: RNTextInputRef | null) => {
    localRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  }, [forwardedRef]);

  const restoreFocus = useCallback(() => {
    if (Platform.OS !== 'web') return;
    if (focusedInputKey !== focusKeyRef.current) return;
    if (isTextEntryElement(getActiveElement())) return;
    localRef.current?.focus?.();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (focusedInputKey !== focusKeyRef.current) return;
    if (clearFocusTimer) {
      clearTimeout(clearFocusTimer);
      clearFocusTimer = null;
    }
    const timer = setTimeout(restoreFocus, 0);
    return () => clearTimeout(timer);
  }, [props.value, restoreFocus]);

  return (
    <RNTextInput
      {...props}
      ref={setRefs}
      onFocus={(event) => {
        if (clearFocusTimer) {
          clearTimeout(clearFocusTimer);
          clearFocusTimer = null;
        }
        focusedInputKey = focusKeyRef.current;
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        if (focusedInputKey === focusKeyRef.current) {
          if (clearFocusTimer) clearTimeout(clearFocusTimer);
          clearFocusTimer = setTimeout(() => {
            focusedInputKey = null;
            clearFocusTimer = null;
          }, 200);
        }
        props.onBlur?.(event);
      }}
      onChangeText={(text) => {
        props.onChangeText?.(text);
        setTimeout(restoreFocus, 0);
      }}
    />
  );
});

StableTextInput.displayName = 'StableTextInput';

export default StableTextInput;
