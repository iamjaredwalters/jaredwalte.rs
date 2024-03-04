import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import { MailIcon, XIcon } from "lucide-react";

export default function Home() {
  return (
    <main className="bg-gray-200 flex min-h-screen flex-col items-center p-24">
      <div className="flex flex-col max-w-screen-md">
        <div className="pb-8 pt-20">
          <h1 className="bg-gradient-to-br from-black via-[#171717] to-[#575757] bg-clip-text text-center text-7xl font-bold tracking-tight text-transparent">
            Jared Walters
          </h1>
          <h2 className="text-xl text-black">Software Engineer</h2>
        </div>
        <ul className="flex flex-col sm:flex-row w-full sm:justify-between text-black">
          <li className="flex justify-center items-center hover:underline underline-offset-1">
            <XIcon className="size-4 mr-1" />
            <a target="blank" href="https://x.com/iamjaredwalters">
              Twitter
            </a>
          </li>
          <li className="flex justify-center items-center hover:underline underline-offset-1">
            <GitHubIcon className="size-4 mr-1" />
            <a target="blank" href="https://github.com/iamjaredwalters">
              Github
            </a>
          </li>
          <li className="flex justify-center items-center hover:underline underline-offset-1">
            <LinkedInIcon className="size-4 mr-1" />
            <a target="blank" href="https://www.linkedin.com/in/jaredwalters/">
              LinkedIn
            </a>
          </li>
          <li className="flex justify-center items-center hover:underline underline-offset-1">
            <MailIcon className="size-4 mr-1" />
            <a target="blank" href="mailto:me@jaredwalte.rs">
              Email
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}
