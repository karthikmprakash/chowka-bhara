import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy · Chowka Bara",
  description:
    "What Chowka Bara stores, where it lives, who can see it, and how long it stays. No accounts, no ads, no tracking.",
};

const CONTACT = "mkarthikprakash.work@gmail.com";
const EFFECTIVE = "21 October 2026";

export default function PrivacyPage() {
  return (
    <div className="policy-shell">
      <header className="policy-header">
        <a href="/" className="policy-brand" aria-label="Chowka Bara home">
          <span className="brand-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            chowka bara<span className="brand-period">.</span>
            <small>THE INDIAN GAME TABLE</small>
          </span>
        </a>
        <a href="/" className="policy-back">
          Back to the game
        </a>
      </header>

      <main className="policy">
        <p className="policy-overline">Privacy policy</p>
        <h1>Your table stays yours.</h1>
        <p className="policy-lead">
          Chowka Bara is a board game, not a data business. There are no
          accounts, no advertising, no analytics, and nothing sold to anyone.
          This page explains the little the game does store, why, and when it
          disappears.
        </p>
        <p className="policy-updated">Last updated {EFFECTIVE}</p>

        <section>
          <h2>The short version</h2>
          <ul>
            <li>No account, email address, phone number, or password.</li>
            <li>No ads, no tracking, no analytics, no advertising ID.</li>
            <li>
              Online rooms store your chosen display name, your avatar, and the
              game state so the other players can see the table.
            </li>
            <li>
              A room and everything in it is deleted automatically within 24
              hours of being created.
            </li>
            <li>
              Local and practice games never leave your device unless you
              choose to create or join an online room.
            </li>
          </ul>
        </section>

        <section>
          <h2>What the game stores on your device</h2>
          <p>
            The game keeps a small amount of information in your browser or
            app storage so it remembers where you left off:
          </p>
          <ul>
            <li>Your display name and chosen avatar.</li>
            <li>Language, theme, sound, and beginner or advanced mode.</li>
            <li>Your saved local or practice game and courtyard journey badges.</li>
            <li>
              A random reconnect token for an online room, so a refresh or a
              dropped connection can rejoin the same seat.
            </li>
          </ul>
          <p>
            This information stays on your device. You can remove all of it by
            clearing the app&rsquo;s storage or your browser site data.
          </p>
        </section>

        <section>
          <h2>What an online room stores on our servers</h2>
          <p>
            Online play needs a shared table, so a room keeps the minimum
            needed to run the game:
          </p>
          <ul>
            <li>The six-character room code.</li>
            <li>Each player&rsquo;s display name and avatar choice.</li>
            <li>
              The game state: board size, whose turn it is, throws, pawn
              positions, and scores.
            </li>
            <li>
              A random reconnect token for each seat, used only to prove that a
              returning device is the same player.
            </li>
          </ul>
          <p>
            Rooms are hosted on Cloudflare Workers and Durable Objects.
            Cloudflare processes network metadata such as your IP address to
            deliver the game and protect the service, as any hosting provider
            does. We do not build profiles from it.
          </p>
        </section>

        <section>
          <h2>How long it stays</h2>
          <ul>
            <li>
              <strong>Online rooms:</strong> deleted within 24 hours of the room
              being created. If every player leaves, the room is usually
              deleted about 15 minutes after the last player disconnects.
              Deleting a room removes its names, tokens, and game state.
            </li>
            <li>
              <strong>Local data:</strong> stays on your device until you clear
              it or uninstall the app.
            </li>
            <li>
              <strong>Email:</strong> if you write to us, we keep your message
              only as long as needed to answer it.
            </li>
          </ul>
          <p>
            We do not keep a separate database or backup copy of room data.
          </p>
        </section>

        <section>
          <h2>Who can see it</h2>
          <ul>
            <li>
              <strong>Other players at your table</strong> see your display
              name, avatar, and moves. That is the point of a shared board.
              Nobody outside the room can see it unless you share the room
              code.
            </li>
            <li>
              <strong>Cloudflare</strong> hosts the game as our service
              provider and processes it on our behalf.
            </li>
            <li>
              <strong>Nobody else.</strong> We do not sell data, share it with
              advertisers, or use it to train anything.
            </li>
          </ul>
        </section>

        <section>
          <h2>What we never collect</h2>
          <p>
            No account or contact details, no contacts, location, camera,
            microphone, photos, or files. No advertising ID. No third-party
            analytics or crash-reporting SDKs. The Android app asks for only two
            permissions: internet access and vibration for the cowrie throw.
          </p>
        </section>

        <section>
          <h2>Cookies and local storage</h2>
          <p>
            We do not use cookies for advertising or analytics. The game uses
            your browser or app storage for the preferences and saved game
            described above. That storage is strictly functional: without it,
            the game could not remember your language, your name, or your seat.
          </p>
        </section>

        <section>
          <h2>Security</h2>
          <p>
            Everything travels over HTTPS with TLS. Room codes are random and
            hard to guess, and there are no passwords to steal. A reconnect
            token only grants access to one seat in one room, and it dies with
            the room. No system is perfect, so please do not put anything
            private in your display name.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>
            Chowka Bara is a general-audience game and is not directed at
            children under 13. We do not knowingly collect personal information
            from children. If a child plays, the only information shared is the
            display name that was typed at the table. A parent or guardian can
            write to us to have a room deleted early.
          </p>
        </section>

        <section>
          <h2>Your choices and rights</h2>
          <p>
            You can ask us to confirm what a room holds, correct a display
            name, or delete a room before its 24 hours are up. You can also
            object to processing or ask for a copy of what is stored. Write to{" "}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a> with the room code if you
            have it. We reply within 30 days. Because there is no account, we
            may need the room code or approximate time of play to find the
            right table.
          </p>
          <p>
            If you are in the EU or UK, you have the rights in the GDPR. If you
            are in India, you have the rights in the Digital Personal Data
            Protection Act, 2023. We honour these requests wherever you live.
          </p>
        </section>

        <section>
          <h2>Where your data is processed</h2>
          <p>
            Cloudflare runs the game on its global network, so a room may be
            processed outside your country. Cloudflare&rsquo;s standard
            contractual clauses cover those transfers.
          </p>
        </section>

        <section>
          <h2>Changes to this policy</h2>
          <p>
            If the way the game handles data changes, we update this page and
            its date. A material change will also be noted in the app. If you
            keep playing after a change, the new policy applies.
          </p>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>
            Chowka Bara is made by Karthik M Prakash, an independent developer.
            Questions, requests, and complaints go to{" "}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We will always answer.
          </p>
        </section>
      </main>

      <footer className="policy-footer">
        <span>ಆಡೋಣ ಬನ್ನಿ</span>
        <a href="/">Return to the table</a>
      </footer>
    </div>
  );
}
