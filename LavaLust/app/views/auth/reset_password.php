<?php defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');
/** Simple server-side password reset form used when user opens /auth/reset?token=... */
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Password Reset</title>
  <style>body{font-family:system-ui,Arial;background:#f7fafc;padding:24px} .card{max-width:520px;margin:32px auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 6px 24px rgba(16,24,40,0.08)} .btn{background:#1754cf;color:#fff;padding:10px 14px;border:none;border-radius:6px;cursor:pointer}</style>
</head>
<body>
  <div class="card">
    <h2>Password Reset</h2>
    <?php if (!empty($error)): ?>
      <div style="background:#fee2e2;padding:10px;border-radius:6px;margin-bottom:12px;color:#991b1b"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <?php if (!empty($success)): ?>
      <div style="background:#ecfccb;padding:10px;border-radius:6px;margin-bottom:12px;color:#14532d"><?= htmlspecialchars($success) ?></div>
    <?php endif; ?>

    <?php if (empty($token)): ?>
      <p>Invalid or missing token. Please use the link sent to your email.</p>
    <?php else: ?>
      <form method="post" action="/auth/reset">
        <input type="hidden" name="token" value="<?= htmlspecialchars($token) ?>" />
        <div style="margin-bottom:12px">
          <label>New password (min 6 chars)</label>
          <input type="password" name="password" required style="width:100%;padding:10px;margin-top:6px;border-radius:6px;border:1px solid #e5e7eb" />
        </div>
        <button class="btn" type="submit">Set new password</button>
      </form>
    <?php endif; ?>
    <p style="margin-top:14px;font-size:13px;color:#6b7280">If you didn't request a password reset, ignore this email.</p>
  </div>
</body>
</html>