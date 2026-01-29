import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Users, Gamepad2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TicTacToeModeSelectorProps {
  onSelectMode: (mode: "ai" | "friend") => void;
}

export const TicTacToeModeSelector = ({ onSelectMode }: TicTacToeModeSelectorProps) => {
  const { t } = useTranslation();

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
          <Gamepad2 className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-xl">
          {t("games.ticTacToe.howToPlay", { defaultValue: "How would you like to play?" })}
        </CardTitle>
        <CardDescription>
          {t("games.ticTacToe.chooseMode", { defaultValue: "Choose your game mode to get started" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {/* Play vs AI Option */}
        <button
          onClick={() => onSelectMode("ai")}
          className="w-full p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {t("games.ticTacToe.playVsAI", { defaultValue: "Play vs DolphySN" })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("games.ticTacToe.aiDescription", { defaultValue: "Challenge our AI for a quick game anytime" })}
              </p>
            </div>
          </div>
        </button>

        {/* Play with Friend Option */}
        <button
          onClick={() => onSelectMode("friend")}
          className="w-full p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {t("games.ticTacToe.inviteFriend", { defaultValue: "Invite a Friend" })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("games.ticTacToe.friendDescription", { defaultValue: "Send an invite and play turn-by-turn" })}
              </p>
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
  );
};
