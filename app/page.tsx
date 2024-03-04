import { TextRevealCard } from "@/components/ui/text-reveal-card";

export default function Home() {
  return (
    <main className="bg-[#1d1c20] flex min-h-screen flex-col justify-between p-24">
      <h2 className="text-white text-lg mb-2">Jared Walters</h2>
      <h3>About me:</h3>
      <TextRevealCard
        text="Software Engineer"
        revealText="Insatiably Curious"
      />
      <TextRevealCard
        text="Dreamer and Builder"
        revealText="Husband and Father"
      />
      <TextRevealCard text="Runner of races" revealText="Reader of books" />
      <TextRevealCard text="Cooker of food" revealText="BBQer of sorts" />
      <p>Find me:</p>
      <ul>
        <li>
          <a href="https://x.com/iamjaredwalters">Twitter</a>
        </li>
        <li>
          <a href="https://github.com/iamjaredwalters">Github</a>
        </li>
        <li>
          <a href="https://www.linkedin.com/in/jaredwalters/">LinkedIn</a>
        </li>
      </ul>
      <p>Call me:</p>
      <ul>
        <li>
          <a href="mailto:me@jaredwalte.rs">Email</a>
        </li>
      </ul>
    </main>
  );
}
