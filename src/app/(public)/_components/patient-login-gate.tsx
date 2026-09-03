import { PatientLoginForm } from "./patient-login-form";

interface PatientLoginGateProps {
  title: string;
  next?: string;
}

export function PatientLoginGate({ title, next }: PatientLoginGateProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <PatientLoginForm title={title} next={next} />
    </div>
  );
}
