import { LoginChooser } from "./login-chooser";

interface PatientLoginGateProps {
  title: string;
  next?: string;
}

export function PatientLoginGate({ title, next }: PatientLoginGateProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <LoginChooser description={title} next={next} />
    </div>
  );
}
