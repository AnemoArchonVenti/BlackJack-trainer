<script>
  // The account controls, shown inside the settings panel.
  //
  // Signing in is optional and the copy here says so plainly, because the honest pitch is small:
  // it does not unlock anything, it only means your progress survives clearing this browser and
  // turns up on your phone. Somebody who does not want an account loses nothing by ignoring it.
  import { account, signInUrl, signOut, deleteAccount } from './account.svelte.js';

  // Deleting is irreversible, so it takes two deliberate clicks rather than a browser confirm(),
  // which is easy to dismiss by reflex and impossible to style.
  let confirmingDelete = $state(false);

  const when = (ms) => {
    if (!ms) return null;
    const mins = Math.round((Date.now() - ms) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    return hrs < 24 ? `${hrs} h ago` : `${Math.round(hrs / 24)} d ago`;
  };

  async function onDelete() {
    if (await deleteAccount()) confirmingDelete = false;
  }
</script>

<section class="group">
  <h2>Account</h2>

  {#if account.status === 'unknown'}
    <p class="blurb">Checking…</p>
  {:else if !account.configured && account.status === 'signed-out'}
    <p class="blurb">
      Your progress is saved in this browser. Accounts are not switched on for this deployment yet.
    </p>
  {:else if account.status === 'signed-out'}
    <p class="blurb">
      Your progress is saved in this browser. Sign in and it is copied to your account too, so it
      survives clearing your data and shows up on your other devices.
    </p>
    <div class="field">
      <a class="button" href={signInUrl()}>Continue with Google</a>
      <p class="help">
        No password is created or stored. The only thing kept is your email address, so the app can
        show you which account you are signed in as. <a href="/privacy">What is stored</a>.
      </p>
    </div>
  {:else}
    <p class="blurb signed-in">
      Signed in as <strong>{account.user?.email ?? 'your account'}</strong>.
    </p>

    <p class="help status">
      {#if account.syncing}
        Syncing…
      {:else if account.error}
        <span class="bad">{account.error}</span> Your progress is still safe in this browser.
      {:else if account.lastSyncedAt}
        Progress synced {when(account.lastSyncedAt)}.
      {:else}
        Nothing to sync yet.
      {/if}
    </p>

    <div class="field row">
      <button class="secondary" onclick={signOut}>Sign out</button>
      {#if !confirmingDelete}
        <button class="danger-link" onclick={() => (confirmingDelete = true)}>Delete account</button>
      {/if}
    </div>

    {#if confirmingDelete}
      <div class="field confirm">
        <p class="help">
          This deletes your account and the progress stored on the server, permanently. The copy in
          this browser is left alone — you would carry on exactly as you are now, just without sync.
        </p>
        <div class="row">
          <button class="danger" onclick={onDelete}>Delete it permanently</button>
          <button class="secondary" onclick={() => (confirmingDelete = false)}>Keep my account</button>
        </div>
      </div>
    {/if}
  {/if}
</section>

<style>
  .group h2 {
    font-family: var(--mono); font-size: 12px; font-weight: 500; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--text-h); margin: 0 0 4px;
    padding-bottom: 8px; border-bottom: 1px solid var(--rule);
  }
  .blurb { margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: var(--text); max-width: 34ch; }
  .blurb.signed-in { color: var(--text-h); }
  .field { margin-top: var(--s-3); }
  .row { display: flex; gap: var(--s-2); flex-wrap: wrap; align-items: center; }
  .help { margin: 6px 0 0; font-size: 12px; line-height: 1.5; color: var(--text); max-width: 34ch; }
  .help a { color: var(--text-h); }
  .status { min-height: 1.2em; }
  .bad { color: var(--danger); }

  .button {
    display: inline-block; background: var(--btn); color: var(--on-btn); text-decoration: none;
    padding: 8px 14px; border-radius: var(--r-sm); font-size: 14px; font-weight: 500;
  }
  .secondary {
    padding: 7px 12px; border: 1px solid var(--border); border-radius: var(--r-sm);
    background: none; color: var(--text-h); font: inherit; font-size: 14px; cursor: pointer;
  }
  .secondary:hover { background: var(--hover); }
  .danger {
    padding: 7px 12px; border: 1px solid var(--danger); border-radius: var(--r-sm);
    background: var(--danger); color: #fff; font: inherit; font-size: 14px; cursor: pointer;
  }
  .danger-link {
    background: none; border: 0; padding: 0; font: inherit; font-size: 13px;
    color: var(--danger); cursor: pointer; text-decoration: underline;
  }
  .confirm { border-left: 2px solid var(--danger); padding-left: 12px; }
</style>
