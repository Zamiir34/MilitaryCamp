// lib/screens/chat_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../services/auth_provider.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

// Role color config matching the web app
Color _roleColor(String role) {
  switch (role) {
    case 'Administrator':
    case 'admin':
      return AppColors.danger;
    case 'SecurityOfficer':
    case 'officer':
      return AppColors.warning;
    default:
      return AppColors.primary;
  }
}

String _roleLabel(String role) {
  switch (role) {
    case 'Administrator':
    case 'admin':
      return 'ADMIN';
    case 'SecurityOfficer':
    case 'officer':
      return 'OFFICER';
    default:
      return 'GUARD';
  }
}

String _fmtTime(DateTime d) => DateFormat('HH:mm').format(d);

String _fmtDate(DateTime d) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final yest  = today.subtract(const Duration(days: 1));
  final day   = DateTime(d.year, d.month, d.day);
  if (day == today) return 'Today';
  if (day == yest)  return 'Yesterday';
  return DateFormat('MMM d').format(d);
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});
  @override State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _api = ApiService();
  List<ChatUser> _users = [];
  List<ChatConversation> _conversations = [];
  ChatUser? _selected;
  List<ChatMessage> _messages = [];
  bool _loadingMsgs = false;
  bool _sending = false;
  String _search = '';

  final _msgCtrl   = TextEditingController();
  final _searchCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  Timer? _pollTimer;
  Timer? _convTimer;

  @override
  void initState() {
    super.initState();
    _loadUsersAndConversations();
    _convTimer = Timer.periodic(const Duration(seconds: 12), (_) => _loadConversations());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _convTimer?.cancel();
    _msgCtrl.dispose();
    _searchCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadUsersAndConversations() async {
    try {
      final users = await _api.getChatUsers();
      final convs = await _api.getConversations();
      if (mounted) setState(() { _users = users; _conversations = convs; });
    } catch (_) {}
  }

  Future<void> _loadConversations() async {
    try {
      final convs = await _api.getConversations();
      if (mounted) setState(() => _conversations = convs);
    } catch (_) {}
  }

  Future<void> _openConversation(ChatUser target) async {
    setState(() { _selected = target; _loadingMsgs = true; _messages = []; });
    _pollTimer?.cancel();
    try {
      final msgs = await _api.getMessages(target.id);
      await _api.markMessagesRead(target.id);
      if (mounted) {
        setState(() {
          _messages = msgs;
          _loadingMsgs = false;
          _conversations = _conversations.map((c) =>
            c.user.id == target.id ? ChatConversation(user: c.user, lastMessage: c.lastMessage, unread: 0) : c
          ).toList();
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => _loadingMsgs = false);
    }
    // Start polling
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _pollMessages());
  }

  Future<void> _pollMessages() async {
    if (_selected == null) return;
    try {
      final msgs = await _api.getMessages(_selected!.id);
      if (mounted && msgs.length != _messages.length) {
        setState(() => _messages = msgs);
        _scrollToBottom();
        await _api.markMessagesRead(_selected!.id);
      }
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _sendMessage() async {
    final content = _msgCtrl.text.trim();
    if (content.isEmpty || _selected == null || _sending) return;
    _msgCtrl.clear();
    setState(() => _sending = true);
    try {
      final msg = await _api.sendMessage(_selected!.id, content);
      if (mounted) {
        setState(() {
          if (!_messages.any((m) => m.id == msg.id)) _messages.add(msg);
          _sending = false;
        });
        _scrollToBottom();
        _loadConversations();
      }
    } catch (_) {
      if (mounted) { _msgCtrl.text = content; setState(() => _sending = false); }
    }
  }

  // ─── Build ────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final currentUser = context.watch<AuthProvider>().user;
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.surfaceColor,
        title: Row(children: [
          const Icon(Icons.shield, color: AppColors.secondary, size: 18),
          const SizedBox(width: 8),
          Text('COMMS', style: TextStyle(color: context.textPrimary, fontWeight: FontWeight.w800, letterSpacing: 2, fontSize: 18)),
        ]),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.primary.withOpacity(0.3)),
            ),
            child: const Row(children: [
              Icon(Icons.circle, color: AppColors.primary, size: 7),
              SizedBox(width: 5),
              Text('POLLING', style: TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
            ]),
          ),
        ],
      ),
      body: _selected == null
          ? _buildContactsOnly(currentUser)
          : _buildChatView(currentUser),
    );
  }

  // Full screen contact list when nothing is selected
  Widget _buildContactsOnly(User? currentUser) {
    return Column(children: [
      _buildSearchBar(),
      Expanded(child: _buildContactList(currentUser)),
    ]);
  }

  // Chat view — on mobile, shows the conversation fullscreen
  Widget _buildChatView(User? currentUser) {
    return Column(children: [
      _buildChatHeader(),
      Expanded(child: _buildMessagesList(currentUser)),
      _buildInput(),
    ]);
  }

  Widget _buildSearchBar() => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: context.surfaceColor, border: Border(bottom: BorderSide(color: context.borderColor))),
    child: TextField(
      controller: _searchCtrl,
      style: TextStyle(color: context.textPrimary, fontSize: 14),
      decoration: InputDecoration(
        hintText: 'Search personnel...',
        hintStyle: TextStyle(color: context.textMuted, fontSize: 14),
        prefixIcon: Icon(Icons.search, color: context.textMuted, size: 18),
        filled: true,
        fillColor: AppColors.surfaceVariant,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(vertical: 10),
      ),
      onChanged: (v) => setState(() => _search = v),
    ),
  );

  Widget _buildContactList(User? currentUser) {
    final convIds = _conversations.map((c) => c.user.id).toSet();
    final extras = _users.where((u) => !convIds.contains(u.id) && u.id != currentUser?.id).toList();

    final filtConvs = _conversations.where((c) =>
      _search.isEmpty ||
      c.user.fullName.toLowerCase().contains(_search.toLowerCase()) ||
      c.user.role.toLowerCase().contains(_search.toLowerCase())
    ).toList();

    final filtExtras = extras.where((u) =>
      _search.isEmpty ||
      u.fullName.toLowerCase().contains(_search.toLowerCase()) ||
      u.role.toLowerCase().contains(_search.toLowerCase())
    ).toList();

    if (filtConvs.isEmpty && filtExtras.isEmpty) {
      return Center(child: Text('No personnel found', style: TextStyle(color: context.textMuted)));
    }

    return ListView(children: [
      if (filtConvs.isNotEmpty) ...[
        _buildListLabel('RECENT'),
        ...filtConvs.map((c) => _ContactTile(u: c.user, conv: c, onTap: () => _openConversation(c.user))),
      ],
      if (filtExtras.isNotEmpty) ...[
        _buildListLabel('ALL PERSONNEL'),
        ...filtExtras.map((u) => _ContactTile(u: u, conv: null, onTap: () => _openConversation(u))),
      ],
    ]);
  }

  Widget _buildListLabel(String label) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
    child: Text(label, style: TextStyle(fontSize: 10, color: context.textMuted, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
  );

  Widget _buildChatHeader() {
    final rc = _roleColor(_selected!.role);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(color: context.surfaceColor, border: Border(bottom: BorderSide(color: context.borderColor))),
      child: Row(children: [
        GestureDetector(
          onTap: () { _pollTimer?.cancel(); setState(() { _selected = null; _messages = []; }); },
          child: Icon(Icons.arrow_back_ios, color: context.textSecondary, size: 18),
        ),
        const SizedBox(width: 12),
        _AvatarWidget(initials: _selected!.initials, color: rc, size: 40),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_selected!.fullName, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: context.textPrimary, letterSpacing: 0.3)),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(color: rc.withOpacity(0.15), borderRadius: BorderRadius.circular(4)),
              child: Text(_roleLabel(_selected!.role), style: TextStyle(color: rc, fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 1)),
            ),
            if (_selected!.rank != null) ...[
              const SizedBox(width: 6),
              Text(_selected!.rank!, style: TextStyle(fontSize: 11, color: context.textMuted)),
            ],
          ]),
        ])),
        const Row(children: [
          Icon(Icons.lock_outline, color: AppColors.primary, size: 13),
          SizedBox(width: 4),
          Text('SECURE', style: TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1)),
        ]),
      ]),
    );
  }

  Widget _buildMessagesList(User? currentUser) {
    if (_loadingMsgs) {
      return Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_messages.isEmpty) {
      return Center(
        child: Text('— No messages yet. Begin the conversation. —',
          style: TextStyle(color: context.textMuted, fontSize: 12), textAlign: TextAlign.center),
      );
    }

    // Group by date
    final List<_ChatItem> items = [];
    String? lastDate;
    for (final m in _messages) {
      final ds = _fmtDate(m.createdAt);
      if (ds != lastDate) { items.add(_ChatItem.date(ds)); lastDate = ds; }
      items.add(_ChatItem.message(m));
    }

    return ListView.builder(
      controller: _scrollCtrl,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final item = items[i];
        if (item.isDate) return _buildDateDivider(item.label!);
        final msg = item.message!;
        final isMine = msg.sender?.id == currentUser?.id;
        return _buildMessageBubble(msg, isMine);
      },
    );
  }

  Widget _buildDateDivider(String label) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Row(children: [
      Expanded(child: Divider(color: context.borderColor)),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Text(label.toUpperCase(), style: TextStyle(fontSize: 10, color: context.textMuted, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
      ),
      Expanded(child: Divider(color: context.borderColor)),
    ]),
  );

  Widget _buildMessageBubble(ChatMessage msg, bool isMine) {
    final rc = _roleColor(msg.sender?.role ?? 'Guard');
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMine) ...[
            _AvatarWidget(initials: msg.sender?.initials ?? '?', color: rc, size: 28),
            const SizedBox(width: 8),
          ],
          Column(
            crossAxisAlignment: isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              if (!isMine)
                Padding(
                  padding: const EdgeInsets.only(left: 2, bottom: 3),
                  child: Text(msg.sender?.fullName.split(' ').first.toUpperCase() ?? '',
                    style: TextStyle(fontSize: 10, color: rc, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                ),
              ConstrainedBox(
                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.65),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  decoration: BoxDecoration(
                    color: isMine ? AppColors.secondary : AppColors.surface,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMine ? 16 : 4),
                      bottomRight: Radius.circular(isMine ? 4 : 16),
                    ),
                    border: isMine ? null : Border.all(color: context.borderColor),
                    boxShadow: isMine ? [BoxShadow(color: AppColors.secondary.withOpacity(0.25), blurRadius: 8, offset: const Offset(0, 2))] : [],
                  ),
                  child: Text(msg.content, style: TextStyle(
                    color: isMine ? Colors.white : context.textPrimary,
                    fontSize: 14, height: 1.5,
                  )),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 3, left: 4, right: 4),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(_fmtTime(msg.createdAt), style: TextStyle(fontSize: 10, color: context.textMuted)),
                  if (isMine) ...[
                    const SizedBox(width: 4),
                    Text(msg.read ? '✓✓' : '✓', style: TextStyle(fontSize: 10, color: context.textMuted)),
                  ],
                ]),
              ),
            ],
          ),
          if (isMine) const SizedBox(width: 4),
        ],
      ),
    );
  }

  Widget _buildInput() => Container(
    padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).padding.bottom + 12),
    decoration: BoxDecoration(color: context.surfaceColor, border: Border(top: BorderSide(color: context.borderColor))),
    child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      Expanded(
        child: TextField(
          controller: _msgCtrl,
          style: TextStyle(color: context.textPrimary, fontSize: 14),
          maxLines: 4, minLines: 1,
          textInputAction: TextInputAction.newline,
          decoration: InputDecoration(
            hintText: 'Type a secure message…',
            hintStyle: TextStyle(color: context.textMuted, fontSize: 14),
            filled: true,
            fillColor: AppColors.surfaceVariant,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          ),
          onSubmitted: (_) => _sendMessage(),
        ),
      ),
      const SizedBox(width: 10),
      GestureDetector(
        onTap: _sendMessage,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 46, height: 46,
          decoration: BoxDecoration(
            color: _msgCtrl.text.trim().isNotEmpty ? AppColors.secondary : AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(12),
            boxShadow: _msgCtrl.text.trim().isNotEmpty
                ? [BoxShadow(color: AppColors.secondary.withOpacity(0.3), blurRadius: 8)]
                : [],
          ),
          child: _sending
              ? const Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Icon(Icons.send_rounded, color: _msgCtrl.text.trim().isNotEmpty ? Colors.white : context.textMuted, size: 20),
        ),
      ),
    ]),
  );
}

// ─── Contact Tile ─────────────────────────────────────────────────
class _ContactTile extends StatelessWidget {
  final ChatUser u;
  final ChatConversation? conv;
  final VoidCallback onTap;
  const _ContactTile({required this.u, required this.conv, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final rc = _roleColor(u.role);
    final unread = conv?.unread ?? 0;
    final lastMsg = conv?.lastMessage;
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: context.borderColor.withOpacity(0.5)))),
        child: Row(children: [
          _AvatarWidget(initials: u.initials, color: rc, size: 44),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(u.fullName, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: context.textPrimary), overflow: TextOverflow.ellipsis)),
              if (lastMsg != null)
                Text(_fmtTime(lastMsg.createdAt), style: TextStyle(fontSize: 10, color: context.textMuted)),
            ]),
            const SizedBox(height: 3),
            Row(children: [
              Expanded(
                child: lastMsg != null
                    ? Text(lastMsg.content, style: TextStyle(fontSize: 12, color: context.textMuted), overflow: TextOverflow.ellipsis, maxLines: 1)
                    : Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(color: rc.withOpacity(0.15), borderRadius: BorderRadius.circular(4)),
                        child: Text(_roleLabel(u.role), style: TextStyle(color: rc, fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 1)),
                      ),
              ),
              if (unread > 0)
                Container(
                  width: 20, height: 20,
                  decoration: BoxDecoration(color: AppColors.secondary, shape: BoxShape.circle),
                  child: Center(child: Text(unread > 9 ? '9+' : '$unread',
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800))),
                ),
            ]),
          ])),
        ]),
      ),
    );
  }
}

// ─── Avatar Widget ────────────────────────────────────────────────
class _AvatarWidget extends StatelessWidget {
  final String initials;
  final Color color;
  final double size;
  const _AvatarWidget({required this.initials, required this.color, required this.size});

  @override
  Widget build(BuildContext context) => Container(
    width: size, height: size,
    decoration: BoxDecoration(
      color: color.withOpacity(0.12),
      shape: BoxShape.circle,
      border: Border.all(color: color.withOpacity(0.4), width: 1.5),
    ),
    child: Center(child: Text(initials,
      style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: size * 0.33, letterSpacing: 0.5))),
  );
}

// ─── Helper class for grouped messages ───────────────────────────
class _ChatItem {
  final bool isDate;
  final String? label;
  final ChatMessage? message;
  _ChatItem.date(this.label) : isDate = true, message = null;
  _ChatItem.message(this.message) : isDate = false, label = null;
}
