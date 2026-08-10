import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-32 text-center">
      <p className="font-mono text-sm tracking-[0.2em] text-primary uppercase">404</p>
      <h1 className="text-flame mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
        This page is not here.
      </h1>
      <p className="mt-5 max-w-md text-base/7 text-muted text-pretty">
        The link may be old, or the page may have moved. The download page is where most people
        are headed.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/download">Download CryoZen</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back home
        </ButtonLink>
      </div>
    </Container>
  );
}
