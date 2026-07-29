-- Track the chat message that currently owns the inline keyboard.

alter table public.telegram_links
  add column if not exists last_keyboard_message_id bigint;

comment on column public.telegram_links.last_keyboard_message_id is
  'Message id of the bot message that currently has an inline keyboard in this chat.';
