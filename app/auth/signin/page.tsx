// Auth disabled for MVP
export default function SignIn() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            Authentication Disabled
          </h2>
          <p className="mt-4 text-gray-600">
            Authentication is disabled for the MVP version.
          </p>
        </div>
      </div>
    </div>
  );
}
