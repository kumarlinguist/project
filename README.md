# Firebase setup

1. Open Firebase Console for project `chat2-a7562`.
2. Authentication → Sign-in method → enable **Email/Password**.
3. Firestore Database → create a database.
4. Storage → enable Firebase Storage.
5. Paste `firestore.rules` into Firestore Rules and `storage.rules` into Storage Rules.
6. Serve this folder from a web server (for example VS Code Live Server). Do not open `index.html` directly as a `file://` page.
7. Create two accounts and test messaging between them.

## Included features
- Email/password registration and login
- Firebase Authentication
- Realtime Firestore messages
- Text messages
- Photo uploads
- Video uploads with in-browser playback
- Audio uploads
- General file uploads
- User search
- Responsive/mobile layout
- Upload progress
- Firestore/Storage security rules

## Production notes
The rules here are a starter configuration. Before public launch, add stronger validation, rate limiting/app-check, moderation/abuse controls, file-type validation, message deletion policies, pagination, and appropriate Storage/Firestore indexes as your feature set grows.
